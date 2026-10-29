// Maincra Daily v11: rotación robusta, historial y resincronización de FTB Quests.
// Se instala después de 30_daily_missions.js y 97_daily_missions_static.js.

const MaincraDailyV10Integer = Java.loadClass('java.lang.Integer')
const MaincraDailyV10ArrayList = Java.loadClass('java.util.ArrayList')
const MaincraDailyV10PlayerQuestData = Java.loadClass('dev.ftb.mods.ftbxmodcompat.ftbquests.kubejs.FTBQuestsKubeJSPlayerData')
const MaincraDailyV10SyncTeamData = Java.loadClass('dev.ftb.mods.ftbquests.net.SyncTeamDataMessage')
const MAINCRA_DAILY_V10_UNSAFE = new Set([20, 28])
const MAINCRA_DAILY_V10_HISTORY_LIMIT = 14

const maincraDailyV10Signature = ids => ids.map(value => Number(value)).join(',')

const maincraDailyV10ParseSignature = text => {
  if (!text) return []
  let values = String(text).split(',')
  let result = []
  for (let index = 0; index < values.length; index++) {
    let value = Number(values[index])
    if (!isFinite(value)) return []
    result.push(Math.floor(value))
  }
  return result
}

const maincraDailyV10ValidSelection = ids => {
  if (!ids || ids.length != global.MAINCRA_DAILY_SELECTION_SIZE) return false
  let unique = new Set()
  let slots = new Set()
  for (let index = 0; index < ids.length; index++) {
    let id = Number(ids[index])
    if (!isFinite(id) || MAINCRA_DAILY_V10_UNSAFE.has(id) || !global.maincraDailyObjective(id)) return false
    unique.add(id)
    slots.add((id - 1) % 5)
  }
  return unique.size == global.MAINCRA_DAILY_SELECTION_SIZE
    && slots.size == global.MAINCRA_DAILY_SELECTION_SIZE
    && global.maincraDailyBalanced(ids)
}

const maincraDailyV10ReadSelection = (data, arrayKey, signatureKey) => {
  let selected = global.maincraDailyIntArray(data, arrayKey)
  if (maincraDailyV10ValidSelection(selected)) return selected
  selected = maincraDailyV10ParseSignature(data.getString(signatureKey))
  return maincraDailyV10ValidSelection(selected) ? selected : []
}

const maincraDailyV10ReadHistory = data => {
  let raw = String(data.getString('maincra_daily_history_v10'))
  if (!raw) return []
  let history = []
  raw.split('|').forEach(entry => {
    let separator = entry.indexOf(':')
    if (separator < 1) return
    let cycle = entry.substring(0, separator)
    let selected = maincraDailyV10ParseSignature(entry.substring(separator + 1))
    if (maincraDailyV10ValidSelection(selected)) history.push({ cycle: cycle, selected: selected })
  })
  return history.slice(-MAINCRA_DAILY_V10_HISTORY_LIMIT)
}

const maincraDailyV10WriteHistory = (data, history) => {
  let normalized = history.slice(-MAINCRA_DAILY_V10_HISTORY_LIMIT)
  data.putString('maincra_daily_history_v10', normalized
    .map(entry => `${entry.cycle}:${maincraDailyV10Signature(entry.selected)}`)
    .join('|'))
}

const maincraDailyV10Overlap = (first, second) => {
  let values = new Set(second || [])
  let overlap = 0
  ;(first || []).forEach(value => { if (values.has(value)) overlap++ })
  return overlap
}

const maincraDailyInstallV10 = server => {
  // V11 mantiene el mismo esquema persistente que V10 para NO provocar un reset
  // global al instalar este hotfix. Solo cambia la lógica de validación.
  global.MAINCRA_DAILY_SCHEMA = 10

  global.maincraDailySafeJavaInt = value => {
    let parsed = Number(value)
    if (!isFinite(parsed)) parsed = 0
    parsed = Math.max(-2147483648, Math.min(2147483647, Math.floor(parsed)))
    return MaincraDailyV10Integer.valueOf(String(parsed).replace(/\.0+$/, ''))
  }

  global.maincraDailyNativeInts = values => {
    let result = new MaincraDailyV10ArrayList()
    if (values != null) {
      for (let index = 0; index < values.length; index++) {
        result.add(global.maincraDailySafeJavaInt(values[index]))
      }
    }
    return result
  }

  global.maincraDailyIntArray = (tag, key) => {
    let result = []
    if (!tag || !tag.contains(key)) return result
    try {
      let raw = tag.getIntArray(key)
      for (let index = 0; index < raw.length; index++) {
        let value = Number(raw[index])
        result.push(isFinite(value) ? Math.floor(value) : 0)
      }
    } catch (error) {
      console.error(`[Maincra Daily] NBT inválido en ${key}; se usará la firma de respaldo: ${error}`)
    }
    return result
  }

  global.maincraDailySelectionFor = (cycle, previous, history) => {
    previous = maincraDailyV10ValidSelection(previous) ? previous : []
    history = history || []

    let groups = [[], [], [], [], []]
    global.MAINCRA_DAILY_OBJECTIVES.forEach(objective => {
      let id = Number(objective.id)
      if (!MAINCRA_DAILY_V10_UNSAFE.has(id)) groups[(id - 1) % 5].push(id)
    })

    let state = global.maincraDailyHash(`maincra-daily-static-v10:${cycle}`)
    let next = bound => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state % bound
    }

    groups.forEach(group => {
      for (let index = group.length - 1; index > 0; index--) {
        let swap = next(index + 1)
        let value = group[index]
        group[index] = group[swap]
        group[swap] = value
      }
    })

    let recent = history.slice(-MAINCRA_DAILY_V10_HISTORY_LIMIT)
    let frequency = {}
    recent.forEach(entry => entry.selected.forEach(id => {
      frequency[id] = Number(frequency[id] || 0) + 1
    }))

    let appearsInHistory = ids => recent.some(entry => global.maincraDailySameSet(ids, entry.selected))
    let choose = (maxOverlap, avoidHistory, forbidSameSet) => {
      let best = null
      let bestScore = null
      let search = (groupIndex, chosen) => {
        if (groupIndex == groups.length) {
          if (!global.maincraDailyBalanced(chosen)) return
          let overlap = maincraDailyV10Overlap(chosen, previous)
          if (previous.length > 0 && overlap > maxOverlap) return
          if (forbidSameSet && previous.length > 0 && global.maincraDailySameSet(chosen, previous)) return
          if (avoidHistory && appearsInHistory(chosen)) return

          let score = overlap * 1000
          chosen.forEach(id => { score += Number(frequency[id] || 0) * 10 })
          if (best == null || score < bestScore) {
            best = chosen.slice()
            bestScore = score
          }
          return
        }

        groups[groupIndex].forEach(id => {
          chosen.push(id)
          search(groupIndex + 1, chosen)
          chosen.pop()
        })
      }
      search(0, [])
      return best
    }

    return choose(0, true, true)
      || choose(1, true, true)
      || choose(2, true, true)
      || choose(4, false, true)
      || choose(5, false, false)
  }

  global.maincraDailyEnsureGlobal = serverObject => {
    let data = serverObject.persistentData
    let clock = global.maincraDailyClock()
    let selected = maincraDailyV10ReadSelection(
      data,
      'maincra_daily_selected',
      'maincra_daily_selected_signature'
    )
    let storedCycle = data.getString('maincra_daily_cycle')
    let valid = data.getInt('maincra_daily_schema') == global.MAINCRA_DAILY_SCHEMA
      && storedCycle == clock.cycle
      && maincraDailyV10ValidSelection(selected)

    if (valid) return selected

    let history = maincraDailyV10ReadHistory(data)
    let previous = selected
    if (!maincraDailyV10ValidSelection(previous)) {
      previous = maincraDailyV10ReadSelection(
        data,
        'maincra_daily_previous',
        'maincra_daily_previous_signature'
      )
    }
    if (!maincraDailyV10ValidSelection(previous) && history.length > 0) {
      previous = history[history.length - 1].selected.slice()
    }

    if (maincraDailyV10ValidSelection(previous) && storedCycle && storedCycle != clock.cycle) {
      history = history.filter(entry => entry.cycle != storedCycle)
      history.push({ cycle: storedCycle, selected: previous.slice() })
    }

    selected = global.maincraDailySelectionFor(clock.cycle, previous, history)
    if (!maincraDailyV10ValidSelection(selected)) {
      throw new Error(`No se pudo generar una selección diaria válida para ${clock.cycle}`)
    }

    history = history.filter(entry => entry.cycle != clock.cycle)
    history.push({ cycle: clock.cycle, selected: selected.slice() })

    data.putIntArray('maincra_daily_previous', global.maincraDailyNativeInts(previous))
    data.putString('maincra_daily_previous_signature', maincraDailyV10Signature(previous))
    data.putIntArray('maincra_daily_selected', global.maincraDailyNativeInts(selected))
    data.putString('maincra_daily_selected_signature', maincraDailyV10Signature(selected))
    maincraDailyV10WriteHistory(data, history)
    data.putString('maincra_daily_cycle', clock.cycle)
    data.putInt('maincra_daily_schema', global.MAINCRA_DAILY_SCHEMA)
    global.maincraDailySyncUI(serverObject, selected)

    console.info(`[Maincra Daily] Rotación ${storedCycle || 'inicial'} -> ${clock.cycle}; anterior [${previous.join(', ')}], nueva [${selected.join(', ')}], coincidencias ${maincraDailyV10Overlap(selected, previous)}.`)

    serverObject.scheduleInTicks(2, () => {
      serverObject.players.forEach(player => {
        try { global.maincraDailyPlayerData(player) }
        catch (error) { console.error(`[Maincra Daily] No se pudo resincronizar ${player.username}: ${error}`) }
      })
    })

    return selected
  }

  global.maincraDailyReadStat = (player, name, fallback) => {
    try {
      if (name == 'getPlayTime') return Number(player.stats.getPlayTime())
      if (name == 'getTimeSinceDeath') return Number(player.stats.getTimeSinceDeath())
      if (name == 'getTimeSinceRest') return Number(player.stats.getTimeSinceRest())
      if (name == 'getJumps') return Number(player.stats.getJumps())
      if (name == 'getWalkDistance') return Number(player.stats.getWalkDistance())
      if (name == 'getSprintDistance') return Number(player.stats.getSprintDistance())
      if (name == 'getCrouchDistance') return Number(player.stats.getCrouchDistance())
      if (name == 'getSwimDistance') return Number(player.stats.getSwimDistance())
      if (name == 'getAnimalsBred') return Number(player.stats.getAnimalsBred())
      if (name == 'getFishCaught') return Number(player.stats.getFishCaught())
    } catch (error) {
      console.warn(`[Maincra Daily] Estadística ${name} no disponible; se usará 0: ${error}`)
    }
    return 0
  }

  global.maincraDailyResetPlayer = player => {
    let data = player.persistentData
    let clock = global.maincraDailyClock()
    let selected = global.maincraDailyEnsureGlobal(player.server)
    let signature = maincraDailyV10Signature(selected)

    let walk = global.maincraDailyReadStat(player, 'getWalkDistance', null)
      + global.maincraDailyReadStat(player, 'getSprintDistance', null)
      + global.maincraDailyReadStat(player, 'getCrouchDistance', null)
    let swim = global.maincraDailyReadStat(player, 'getSwimDistance', null)
    let bred = global.maincraDailyReadStat(player, 'getAnimalsBred', null)
    let fish = global.maincraDailyReadStat(player, 'getFishCaught', null)
    let jumps = global.maincraDailyReadStat(player, 'getJumps', null)

    data.putIntArray('maincra_daily_progress', global.maincraDailyNativeInts([0, 0, 0, 0, 0]))
    data.putInt('maincra_daily_completed_mask', 0)
    data.putInt('maincra_daily_completed_count', 0)
    data.putBoolean('maincra_daily_free_claimed', false)
    data.putBoolean('maincra_daily_three_claimed', false)
    data.putLong('maincra_daily_last_activity', Date.now())
    data.putLong('maincra_daily_last_poll_ms', 0)
    data.putInt('maincra_daily_active_seconds', 0)
    data.putInt('maincra_daily_walk_cm', 0)
    data.putInt('maincra_daily_swim_cm', 0)
    data.putInt('maincra_daily_xp_gained', 0)
    data.putInt('maincra_daily_last_walk', walk)
    data.putInt('maincra_daily_last_swim', swim)
    data.putInt('maincra_daily_last_bred', bred)
    data.putInt('maincra_daily_last_fish', fish)
    data.putInt('maincra_daily_last_trade', 0)
    data.putInt('maincra_daily_last_sleep', 0)
    data.putInt('maincra_daily_last_xp', Number(player.xp))
    data.putDouble('maincra_daily_last_x', player.x)
    data.putDouble('maincra_daily_last_y', player.y)
    data.putDouble('maincra_daily_last_z', player.z)
    data.putFloat('maincra_daily_last_yaw', player.yaw)
    data.putFloat('maincra_daily_last_pitch', player.pitch)
    data.putString('maincra_daily_biomes', '')
    data.putString('maincra_daily_jump_cycle', clock.cycle)
    data.putInt('maincra_daily_last_jump', jumps)
    data.putInt('maincra_daily_jumps', 0)

    let questData = new MaincraDailyV10PlayerQuestData(player)
    let teamData = questData.getData()
    let questFile = questData.getFile()
    if (!teamData || !questFile) throw new Error('FTB Quests no devolvió sus datos de servidor')

    global.MAINCRA_DAILY_QUESTS.forEach(questId => questData.reset(questId))

    let freeReward = questFile.getReward(questFile.getID(global.MAINCRA_DAILY_FREE_REWARD))
    let summaryReward = questFile.getReward(questFile.getID(global.MAINCRA_DAILY_SUMMARY_REWARD))
    if (!freeReward) throw new Error(`Recompensa no encontrada: ${global.MAINCRA_DAILY_FREE_REWARD}`)
    if (!summaryReward) throw new Error(`Recompensa no encontrada: ${global.MAINCRA_DAILY_SUMMARY_REWARD}`)

    teamData.resetReward(player.uuid, freeReward)
    teamData.resetReward(player.uuid, summaryReward)
    teamData.clearCachedProgress()
    teamData.markDirty()
    teamData.saveIfChanged()

    data.putString('maincra_daily_cycle', clock.cycle)
    data.putInt('maincra_daily_schema', global.MAINCRA_DAILY_SCHEMA)
    data.putString('maincra_daily_selection_signature', signature)
    data.putInt('maincra_daily_invalid_state_checks', 0)

    try {
      new MaincraDailyV10SyncTeamData(teamData, true).sendTo(player)
      player.server.scheduleInTicks(25, () => {
        try { new MaincraDailyV10SyncTeamData(teamData, true).sendTo(player) } catch (ignored) {}
      })
    } catch (error) {
      console.warn(`[Maincra Daily] Reset aplicado; sincronización inmediata no disponible: ${error}`)
    }

    console.info(`[Maincra Daily] V11: ciclo ${clock.cycle} y selección [${signature}] reiniciados para ${player.username}.`)
  }

  // V11: nunca resetea por una sola lectura inválida. Create y otros mods pueden
  // provocar ráfagas de comprobaciones de FTB Quests mientras actualizan inventarios.
  // Una lectura transitoria incompleta ya no dispara questData.reset(), que era lo
  // que hacía reaparecer continuamente los mensajes visuales de misión completada.
  global.maincraDailyPlayerData = player => {
    let data = player.persistentData
    let clock = global.maincraDailyClock()
    let selected = global.maincraDailyEnsureGlobal(player.server)
    let signature = maincraDailyV10Signature(selected)

    let wrongCycle = data.getString('maincra_daily_cycle') != clock.cycle
    let wrongSchema = data.getInt('maincra_daily_schema') != global.MAINCRA_DAILY_SCHEMA
    let wrongSignature = data.getString('maincra_daily_selection_signature') != signature
    let wrongProgress = global.maincraDailyIntArray(data, 'maincra_daily_progress').length != global.MAINCRA_DAILY_SELECTION_SIZE

    // Los cambios reales de ciclo/esquema siguen siendo inmediatos.
    if (wrongCycle || wrongSchema) {
      data.putInt('maincra_daily_invalid_state_checks', 0)
      global.maincraDailyResetPlayer(player)
      return data
    }

    // Firma/progreso pueden verse momentáneamente inconsistentes durante ráfagas
    // de eventos. Exigimos cinco comprobaciones consecutivas (~5 s en el sondeo
    // normal) antes de hacer un reset destructivo de FTB Quests.
    if (wrongSignature || wrongProgress) {
      let checks = Math.max(0, data.getInt('maincra_daily_invalid_state_checks')) + 1
      data.putInt('maincra_daily_invalid_state_checks', checks)
      if (checks >= 5) {
        console.warn(`[Maincra Daily] Estado inválido persistente para ${player.username} (${checks} comprobaciones); se reparará una vez.`)
        data.putInt('maincra_daily_invalid_state_checks', 0)
        global.maincraDailyResetPlayer(player)
      }
      return data
    }

    if (data.getInt('maincra_daily_invalid_state_checks') != 0) {
      data.putInt('maincra_daily_invalid_state_checks', 0)
    }
    return data
  }

  const showBase = global.maincraDailyShow
  global.maincraDailyShow = player => {
    let data = player.persistentData
    let now = Date.now()
    if (now - Number(data.getLong('maincra_daily_last_show_ms')) < 5000) return
    data.putLong('maincra_daily_last_show_ms', now)
    showBase(player)
  }

  global.maincraDailyEnsureGlobal(server)
  console.info('[Maincra Daily] Motor v11 instalado: reset anti-ráfagas, historial y resincronización activa.')
}

ServerEvents.loaded(event => maincraDailyInstallV10(event.server))

PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(60, () => {
    try {
      global.maincraDailyPlayerData(event.player)
      let data = event.player.persistentData
      if (data.getInt('maincra_daily_integrated_engine_notice') < 11) {
        data.putInt('maincra_daily_integrated_engine_notice', 11)
        event.player.tell(Text.green('[Diarias] Motor v11 cargado: corregidas las resincronizaciones visuales repetidas.'))
      }
      global.maincraDailyShow(event.player)
    } catch (error) {
      console.error(`[Maincra Daily] V11 falló al entrar ${event.player.username}: ${error}`)
    }
  })
})

console.info('[Maincra Daily] Instalador v11 registrado; se aplicará al cargar el servidor.')