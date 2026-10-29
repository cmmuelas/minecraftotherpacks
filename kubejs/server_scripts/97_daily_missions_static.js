// Maincra: interfaz diaria estática compatible con FTB Quests 2001.4.22.
// Sustituye los cinco "slots" renombrados en caliente por 30 misiones reales.
// Solo las cinco seleccionadas se vuelven visibles mediante una tarea de activación.

const MAINCRA_DAILY_STATIC_QUEST_IDS = []
const MAINCRA_DAILY_STATIC_ACTIVE_TASK_IDS = []
const MAINCRA_DAILY_STATIC_PROGRESS_TASK_IDS = []
const MAINCRA_DAILY_STAT_ERRORS = new Set()
const MaincraDailyResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')

// Schema 7 repara el reinicio que quedó interrumpido por PlayerStatsJS.statOf.
// Fuerza una única renovación limpia de las diarias sin tocar ninguna otra misión.
global.MAINCRA_DAILY_SCHEMA = 7

for (let objectiveId = 1; objectiveId <= 30; objectiveId++) {
  let suffix = String(objectiveId).padStart(3, '0')
  MAINCRA_DAILY_STATIC_QUEST_IDS.push(`1800000000001${suffix}`)
  MAINCRA_DAILY_STATIC_ACTIVE_TASK_IDS.push(`1800000000011${suffix}`)
  MAINCRA_DAILY_STATIC_PROGRESS_TASK_IDS.push(`1800000000021${suffix}`)
}

// El reset original consulta esta variable en tiempo de ejecución.
global.MAINCRA_DAILY_QUESTS = MAINCRA_DAILY_STATIC_QUEST_IDS.concat([
  '1800000000000020',
  '1800000000000030'
])

// La UI ya no necesita editar títulos/iconos por red.
global.maincraDailySyncUI = (server, selected) => {}

// Cada posición visual contiene seis misiones superpuestas, pero solo una puede
// seleccionarse. Así siempre aparecen cinco nodos en una fila sin solaparse.
global.maincraDailySelectionFor = (cycle, previous) => {
  let groups = [[], [], [], [], []]
  global.MAINCRA_DAILY_OBJECTIVES.forEach(objective => {
    let id = Number(objective.id)
    groups[(id - 1) % 5].push(id)
  })

  let state = global.maincraDailyHash(
    `maincra-daily-static-v${global.MAINCRA_DAILY_SCHEMA}:${cycle}`
  )

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

  let selected = null
  let search = (groupIndex, chosen) => {
    if (selected) return
    if (groupIndex == groups.length) {
      if (global.maincraDailyBalanced(chosen)
        && !global.maincraDailySameSet(chosen, previous)) {
        selected = chosen.slice()
      }
      return
    }

    groups[groupIndex].forEach(id => {
      if (selected) return
      chosen.push(id)
      search(groupIndex + 1, chosen)
      chosen.pop()
    })
  }

  search(0, [])

  // Respaldo defensivo si el banco se modifica incorrectamente en el futuro.
  if (!selected) selected = groups.map(group => group[0])
  return selected
}

MAINCRA_DAILY_STATIC_ACTIVE_TASK_IDS.forEach((taskId, index) => {
  let objectiveId = index + 1

  FTBQuestsEvents.customTask(taskId, event => {
    event.setCheckTimer(20)
    event.setEnableButton(false)
    event.setMaxProgress(1)

    event.setCheck((taskData, player) => {
      let selected = global.maincraDailyEnsureGlobal(player.server)
      taskData.setProgress(selected.includes(objectiveId) ? 1 : 0)
    })
  })
})

MAINCRA_DAILY_STATIC_PROGRESS_TASK_IDS.forEach((taskId, index) => {
  let objectiveId = index + 1
  let objective = global.maincraDailyObjective(objectiveId)
  let goal = objective ? Math.max(1, Math.floor(Number(objective.goal))) : 1

  FTBQuestsEvents.customTask(taskId, event => {
    event.setCheckTimer(20)
    event.setEnableButton(false)
    event.setMaxProgress(goal)

    event.setCheck((taskData, player) => {
      let selected = global.maincraDailyEnsureGlobal(player.server)
      let slot = selected.indexOf(objectiveId)
      if (slot < 0) {
        taskData.setProgress(0)
        return
      }

      let data = global.maincraDailyPlayerData(player)
      let progress = global.maincraDailyIntArray(data, 'maincra_daily_progress')
      let value = slot < progress.length ? Number(progress[slot]) : 0
      if (!isFinite(value)) value = 0
      taskData.setProgress(Math.max(0, Math.min(goal, Math.floor(value))))
    })
  })
})

// No se delega ninguna lectura a player.stats.get(String). En esta versión de
// KubeJS Rhino intenta convertir el texto a Stat<?> mediante PlayerStatsJS.statOf
// y puede generar una ResourceLocation nula antes incluso de entrar al try/catch.
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

    if (fallback) {
      // Un objeto Java del tipo exacto obliga a Rhino a escoger get(ResourceLocation)
      // y evita por completo la conversión defectuosa hacia Stat<?>.
      let statId = new MaincraDailyResourceLocation(String(fallback))
      return Number(player.stats.get(statId))
    }
  } catch (error) {
    let key = `${name}:${fallback}`
    if (!MAINCRA_DAILY_STAT_ERRORS.has(key)) {
      MAINCRA_DAILY_STAT_ERRORS.add(key)
      console.warn(`[Maincra Daily] Estadística ${key} no disponible; se usará 0 sin detener el motor: ${error}`)
    }
  }
  return 0
}

// Reset integrado en el archivo 97, que el log confirma que se carga.
const MaincraDailyStaticResetPlayer = global.maincraDailyResetPlayer
global.maincraDailyResetPlayer = player => {
  try {
    MaincraDailyStaticResetPlayer(player)
  } catch (error) {
    // Un fallo secundario nunca debe dejar otra vez el ciclo bloqueado.
    console.error(`[Maincra Daily] El reset base falló para ${player.username}; se aplicará el estado mínimo seguro: ${error}`)
    let emergency = player.persistentData
    emergency.putString('maincra_daily_cycle', global.maincraDailyClock().cycle)
    emergency.putInt('maincra_daily_schema', global.MAINCRA_DAILY_SCHEMA)
    emergency.putIntArray('maincra_daily_progress', global.maincraDailyNativeInts([0, 0, 0, 0, 0]))
    emergency.putInt('maincra_daily_completed_mask', 0)
    emergency.putInt('maincra_daily_completed_count', 0)
    emergency.putBoolean('maincra_daily_free_claimed', false)
    emergency.putBoolean('maincra_daily_three_claimed', false)
    emergency.putLong('maincra_daily_last_activity', Date.now())
    emergency.putInt('maincra_daily_active_seconds', 0)
    emergency.putInt('maincra_daily_walk_cm', 0)
    emergency.putInt('maincra_daily_swim_cm', 0)
    emergency.putInt('maincra_daily_xp_gained', 0)
  }

  let data = player.persistentData
  let cycle = global.maincraDailyClock().cycle
  let currentJumps = global.maincraDailyReadStat(player, 'getJumps', 'minecraft:jump')
  data.putString('maincra_daily_jump_cycle', cycle)
  data.putInt('maincra_daily_last_jump', currentJumps)
  data.putInt('maincra_daily_jumps', 0)

  try {
    let teamData = FTBQuests.getData(player)
    let level = player.server.overworld
    let freeReward = FTBQuests.getObject(level, global.MAINCRA_DAILY_FREE_REWARD)
    let summaryReward = FTBQuests.getObject(level, global.MAINCRA_DAILY_SUMMARY_REWARD)

    if (!teamData) throw new Error('TeamData no disponible')
    if (!freeReward) throw new Error(`Recompensa no encontrada: ${global.MAINCRA_DAILY_FREE_REWARD}`)
    if (!summaryReward) throw new Error(`Recompensa no encontrada: ${global.MAINCRA_DAILY_SUMMARY_REWARD}`)

    teamData.resetReward(player.uuid, freeReward)
    teamData.resetReward(player.uuid, summaryReward)
    teamData.clearCachedProgress()
    teamData.markDirty()
    try {
      teamData.saveIfChanged()
    } catch (ignored) {
      // markDirty basta en versiones donde saveIfChanged no está expuesto.
    }
  } catch (error) {
    console.error(`[Maincra Daily] No se pudieron liberar las recompensas de ${player.username}: ${error}`)
  }

  // Sincronización completa opcional. Un fallo de red no cancela la renovación.
  let sync = () => {
    try {
      let SyncTeamDataMessage = Java.loadClass('dev.ftb.mods.ftbquests.net.SyncTeamDataMessage')
      let teamData = FTBQuests.getData(player)
      if (teamData) new SyncTeamDataMessage(teamData, true).sendTo(player)
    } catch (error) {
      console.warn(`[Maincra Daily] Sincronización completa no disponible para ${player.username}: ${error}`)
    }
  }
  sync()
  player.server.scheduleInTicks(25, sync)

  console.info(`[Maincra Daily] Ciclo ${cycle} reiniciado para ${player.username}; recompensas diarias liberadas.`)
}

// Sondeo completo sin biomeId. El guard evita duplicados con el tick antiguo.
global.maincraDailyPoll = player => {
  if (!player) return

  let data = global.maincraDailyPlayerData(player)
  let now = Date.now()
  let lastPoll = Number(data.getLong('maincra_daily_last_poll_ms'))
  if (now - lastPoll < 900) return
  data.putLong('maincra_daily_last_poll_ms', now)

  let walk = global.maincraDailyReadStat(player, 'getWalkDistance', 'minecraft:walk_one_cm')
    + global.maincraDailyReadStat(player, 'getSprintDistance', 'minecraft:sprint_one_cm')
    + global.maincraDailyReadStat(player, 'getCrouchDistance', 'minecraft:crouch_one_cm')
  let walkDelta = Math.max(0, walk - data.getInt('maincra_daily_last_walk'))
  data.putInt('maincra_daily_last_walk', walk)
  data.putInt('maincra_daily_walk_cm', data.getInt('maincra_daily_walk_cm') + walkDelta)
  global.maincraDailySet(player, 23, Math.floor(data.getInt('maincra_daily_walk_cm') / 100))

  let swim = global.maincraDailyReadStat(player, 'getSwimDistance', 'minecraft:swim_one_cm')
  let swimDelta = Math.max(0, swim - data.getInt('maincra_daily_last_swim'))
  data.putInt('maincra_daily_last_swim', swim)
  data.putInt('maincra_daily_swim_cm', data.getInt('maincra_daily_swim_cm') + swimDelta)
  global.maincraDailySet(player, 24, Math.floor(data.getInt('maincra_daily_swim_cm') / 100))

  let bred = global.maincraDailyReadStat(player, 'getAnimalsBred', 'minecraft:animals_bred')
  global.maincraDailyAdd(player, 15, Math.max(0, bred - data.getInt('maincra_daily_last_bred')))
  data.putInt('maincra_daily_last_bred', bred)

  let fish = global.maincraDailyReadStat(player, 'getFishCaught', 'minecraft:fish_caught')
  global.maincraDailyAdd(player, 17, Math.max(0, fish - data.getInt('maincra_daily_last_fish')))
  data.putInt('maincra_daily_last_fish', fish)

  let trades = global.maincraDailyReadStat(player, 'custom', 'minecraft:traded_with_villager')
  global.maincraDailyAdd(player, 20, Math.max(0, trades - data.getInt('maincra_daily_last_trade')))
  data.putInt('maincra_daily_last_trade', trades)

  let sleeps = global.maincraDailyReadStat(player, 'custom', 'minecraft:sleep_in_bed')
  global.maincraDailyAdd(player, 28, Math.max(0, sleeps - data.getInt('maincra_daily_last_sleep')))
  data.putInt('maincra_daily_last_sleep', sleeps)

  let xp = Number(player.xp)
  let xpDelta = Math.max(0, xp - data.getInt('maincra_daily_last_xp'))
  data.putInt('maincra_daily_last_xp', xp)
  data.putInt('maincra_daily_xp_gained', data.getInt('maincra_daily_xp_gained') + xpDelta)
  global.maincraDailySet(player, 26, data.getInt('maincra_daily_xp_gained'))

  let cycle = global.maincraDailyClock().cycle
  let jumps = global.maincraDailyReadStat(player, 'getJumps', 'minecraft:jump')
  if (data.getString('maincra_daily_jump_cycle') != cycle) {
    data.putString('maincra_daily_jump_cycle', cycle)
    data.putInt('maincra_daily_last_jump', jumps)
    data.putInt('maincra_daily_jumps', 0)
  }
  let jumpDelta = Math.max(0, jumps - data.getInt('maincra_daily_last_jump'))
  data.putInt('maincra_daily_last_jump', jumps)
  data.putInt('maincra_daily_jumps', data.getInt('maincra_daily_jumps') + jumpDelta)
  global.maincraDailySet(player, 25, data.getInt('maincra_daily_jumps'))

  let moved = Math.abs(player.x - data.getDouble('maincra_daily_last_x')) > 0.02
    || Math.abs(player.y - data.getDouble('maincra_daily_last_y')) > 0.02
    || Math.abs(player.z - data.getDouble('maincra_daily_last_z')) > 0.02
    || Math.abs(player.yaw - data.getFloat('maincra_daily_last_yaw')) > 1
    || Math.abs(player.pitch - data.getFloat('maincra_daily_last_pitch')) > 1
  if (moved) global.maincraDailyActivity(player)
  data.putDouble('maincra_daily_last_x', player.x)
  data.putDouble('maincra_daily_last_y', player.y)
  data.putDouble('maincra_daily_last_z', player.z)
  data.putFloat('maincra_daily_last_yaw', player.yaw)
  data.putFloat('maincra_daily_last_pitch', player.pitch)

  if (Date.now() - Number(data.getLong('maincra_daily_last_activity')) <= 60000) {
    data.putInt('maincra_daily_active_seconds', data.getInt('maincra_daily_active_seconds') + 1)
  }
  global.maincraDailySet(player, 30, data.getInt('maincra_daily_active_seconds'))
}

// Reloj de servidor fiable: procesa todos los jugadores conectados cada segundo.
let maincraDailyIntegratedServerTicks = 0
ServerEvents.tick(event => {
  maincraDailyIntegratedServerTicks++
  if (maincraDailyIntegratedServerTicks % 20 != 0) return

  event.server.getPlayerList().getPlayers().forEach(player => {
    try {
      global.maincraDailyPoll(player)
    } catch (error) {
      console.error(`[Maincra Daily] Falló el motor integrado para ${player.username}: ${error}`)
    }
  })
})

// Mensaje de versión una sola vez: confirma dentro del juego el motor corregido.
PlayerEvents.loggedIn(event => {
  event.server.scheduleInTicks(20, () => {
    try {
      global.maincraDailyPlayerData(event.player)
      let data = event.player.persistentData
      if (data.getInt('maincra_daily_integrated_engine_notice') < 7) {
        data.putInt('maincra_daily_integrated_engine_notice', 7)
        event.player.tell(Text.green('[Diarias] Motor integrado v7 cargado correctamente.'))
      }
      global.maincraDailyShow(event.player)
    } catch (error) {
      console.error(`[Maincra Daily] Falló la comprobación de entrada para ${event.player.username}: ${error}`)
    }
  })
})

console.info('[Maincra Daily] Interfaz estática y motor integrado v7 cargados correctamente.')