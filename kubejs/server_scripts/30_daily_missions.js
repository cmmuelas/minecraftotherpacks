// Maincra daily missions - KubeJS 6 / FTB Quests 2001.4.22.
// FTB Quests is the UI. All authoritative progress and claims are per-player NBT.

const MaincraZoneId = Java.loadClass('java.time.ZoneId')
const MaincraZonedDateTime = Java.loadClass('java.time.ZonedDateTime')
const MaincraLocalTime = Java.loadClass('java.time.LocalTime')
const MaincraDateTimeFormatter = Java.loadClass('java.time.format.DateTimeFormatter')
const MaincraEditObjectResponse = Java.loadClass('dev.ftb.mods.ftbquests.net.EditObjectResponseMessage')
const MaincraInteger = Java.loadClass('java.lang.Integer')

let maincraDamageTypeTags = null
try {
  maincraDamageTypeTags = Java.loadClass('net.minecraft.tags.DamageTypeTags')
} catch (error) {
  console.warn(`[Maincra Daily] DamageTypeTags no disponible; se usará el respaldo textual: ${error}`)
}

const MAINCRA_DAILY_CONFIG = JsonIO.read('config/maincra/daily_objectives.json')
global.MAINCRA_DAILY_OBJECTIVES = []
MAINCRA_DAILY_CONFIG.objectives.forEach(objective => global.MAINCRA_DAILY_OBJECTIVES.push(objective))

global.MAINCRA_DAILY_SCHEMA = Number(MAINCRA_DAILY_CONFIG.schemaVersion)
global.MAINCRA_DAILY_TIMEZONE = String(MAINCRA_DAILY_CONFIG.timezone)
global.MAINCRA_DAILY_RESET_HOUR = Number(MAINCRA_DAILY_CONFIG.resetHour)
global.MAINCRA_DAILY_SELECTION_SIZE = Number(MAINCRA_DAILY_CONFIG.selectionSize)
global.MAINCRA_DAILY_THRESHOLD = Number(MAINCRA_DAILY_CONFIG.completionThreshold)
global.MAINCRA_DAILY_MAX_CLAIMS = Number(MAINCRA_DAILY_CONFIG.maxDailyClaims)

global.MAINCRA_DAILY_SLOT_TASKS = [
  '1800000000000101',
  '1800000000000102',
  '1800000000000103',
  '1800000000000104',
  '1800000000000105'
]
global.MAINCRA_DAILY_SUMMARY_TASK = '1800000000000110'
global.MAINCRA_DAILY_FREE_TASK = '1800000000000120'
global.MAINCRA_DAILY_SUMMARY_REWARD = '1800000000000201'
global.MAINCRA_DAILY_FREE_REWARD = '1800000000000202'
global.MAINCRA_DAILY_QUESTS = [
  '1800000000000011',
  '1800000000000012',
  '1800000000000013',
  '1800000000000014',
  '1800000000000015',
  '1800000000000020',
  '1800000000000030'
]

const MAINCRA_DAILY_CROP_MAX_AGE = {
  'minecraft:wheat': 7,
  'minecraft:carrots': 7,
  'minecraft:potatoes': 7,
  'minecraft:beetroots': 3,
  'minecraft:nether_wart': 3,
  'farmersdelight:cabbages': 7,
  'farmersdelight:onions': 7,
  'farmersdelight:tomatoes': 3,
  'farmersdelight:rice_panicles': 3
}

const MAINCRA_DAILY_PLANTS = new Set([
  'minecraft:wheat',
  'minecraft:carrots',
  'minecraft:potatoes',
  'minecraft:beetroots',
  'minecraft:nether_wart',
  'minecraft:cocoa',
  'minecraft:melon_stem',
  'minecraft:pumpkin_stem',
  'minecraft:sweet_berry_bush',
  'farmersdelight:cabbages',
  'farmersdelight:onions',
  'farmersdelight:budding_tomatoes',
  'farmersdelight:rice'
])

global.maincraDailyObjective = id => {
  return global.MAINCRA_DAILY_OBJECTIVES.find(objective => Number(objective.id) == Number(id))
}

global.maincraDailyIntArray = (tag, key) => {
  let result = []
  if (!tag.contains(key)) return result
  let raw = tag.getIntArray(key)
  for (let index = 0; index < raw.length; index++) result.push(Number(raw[index]))
  return result
}

// Rhino representa sus números como Double. CompoundTag.putIntArray(List)
// requiere Integer y, al elegir la sobrecarga, puede serializar 10 como "10.0".
global.maincraDailyNativeInts = values => {
  let result = []
  values.forEach(value => {
    let normalized = String(Math.floor(parseFloat(String(value)))).replace(/\.0+$/, '')
    result.push(MaincraInteger.valueOf(normalized))
  })
  return result
}

global.maincraDailyClock = () => {
  let zone = MaincraZoneId.of(global.MAINCRA_DAILY_TIMEZONE)
  let now = MaincraZonedDateTime.now(zone)
  let logicalDate = now.minusHours(global.MAINCRA_DAILY_RESET_HOUR).toLocalDate()
  let nextReset = logicalDate.plusDays(1)
    .atTime(MaincraLocalTime.of(global.MAINCRA_DAILY_RESET_HOUR, 0))
    .atZone(zone)
  return {
    cycle: String(logicalDate),
    nextReset: nextReset,
    nextLabel: String(nextReset.format(MaincraDateTimeFormatter.ofPattern('dd/MM/yyyy HH:mm z')))
  }
}

global.maincraDailyHash = text => {
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

global.maincraDailySameSet = (first, second) => {
  if (first.length != second.length) return false
  let a = first.slice().sort((left, right) => left - right)
  let b = second.slice().sort((left, right) => left - right)
  return a.every((value, index) => value == b[index])
}

global.maincraDailyBalanced = ids => {
  let combat = 0
  let mining = 0
  let routine = 0
  ids.forEach(id => {
    let objective = global.maincraDailyObjective(id)
    if (!objective) return
    if (objective.category == 'combat') combat++
    if (objective.category == 'mining' || objective.category == 'building') mining++
    if (objective.routine) routine++
  })
  if (combat > 2 || mining > 2 || routine < 2) return false

  let values = new Set(ids)
  if (values.has(7) && values.has(29)) return false
  if (values.has(8) && values.has(9)) return false
  if (values.has(8) && values.has(10)) return false
  return true
}

global.maincraDailySelectionFor = (cycle, previous) => {
  let shuffled = global.MAINCRA_DAILY_OBJECTIVES.map(objective => Number(objective.id))
  let state = global.maincraDailyHash(`maincra-daily-v${global.MAINCRA_DAILY_SCHEMA}:${cycle}`)
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    let swap = state % (index + 1)
    let value = shuffled[index]
    shuffled[index] = shuffled[swap]
    shuffled[swap] = value
  }

  let selected = null
  let search = (start, chosen) => {
    if (selected) return
    if (chosen.length == global.MAINCRA_DAILY_SELECTION_SIZE) {
      if (global.maincraDailyBalanced(chosen)
        && !global.maincraDailySameSet(chosen, previous)) selected = chosen.slice()
      return
    }
    for (let index = start; index < shuffled.length; index++) {
      chosen.push(shuffled[index])
      search(index + 1, chosen)
      chosen.pop()
      if (selected) return
    }
  }
  search(0, [])

  if (!selected) {
    selected = shuffled.filter(id => !previous.includes(id)).slice(0, global.MAINCRA_DAILY_SELECTION_SIZE)
  }
  return selected
}

global.maincraDailySyncUI = (server, selected) => {
  let level = server.overworld
  global.MAINCRA_DAILY_SLOT_TASKS.forEach((taskId, slot) => {
    let objective = global.maincraDailyObjective(selected[slot])
    let task = FTBQuests.getObject(level, taskId)
    if (!objective || !task) return
    task.setRawTitle(`${slot + 1}. ${objective.title}`)
    task.setRawIcon(Item.of(String(objective.icon)))
    task.setMaxProgress(Number(objective.goal))
    new MaincraEditObjectResponse(task).sendToAll(server)
  })

  let summaryTask = FTBQuests.getObject(level, global.MAINCRA_DAILY_SUMMARY_TASK)
  if (summaryTask) {
    summaryTask.setRawTitle(`Completa ${global.MAINCRA_DAILY_THRESHOLD} de ${global.MAINCRA_DAILY_SELECTION_SIZE}`)
    summaryTask.setMaxProgress(global.MAINCRA_DAILY_THRESHOLD)
    new MaincraEditObjectResponse(summaryTask).sendToAll(server)
  }

  let freeTask = FTBQuests.getObject(level, global.MAINCRA_DAILY_FREE_TASK)
  if (freeTask) {
    freeTask.setRawTitle(`Case gratuita — próximo reinicio: ${global.maincraDailyClock().nextLabel}`)
    freeTask.setMaxProgress(1)
    new MaincraEditObjectResponse(freeTask).sendToAll(server)
  }
}

global.maincraDailyEnsureGlobal = server => {
  let data = server.persistentData
  let clock = global.maincraDailyClock()
  let selected = global.maincraDailyIntArray(data, 'maincra_daily_selected')
  let valid = data.getInt('maincra_daily_schema') == global.MAINCRA_DAILY_SCHEMA
    && data.getString('maincra_daily_cycle') == clock.cycle
    && selected.length == global.MAINCRA_DAILY_SELECTION_SIZE

  if (!valid) {
    let previous = selected.length == global.MAINCRA_DAILY_SELECTION_SIZE
      ? selected
      : global.maincraDailyIntArray(data, 'maincra_daily_previous')
    selected = global.maincraDailySelectionFor(clock.cycle, previous)
    data.putIntArray('maincra_daily_previous', global.maincraDailyNativeInts(previous))
    data.putIntArray('maincra_daily_selected', global.maincraDailyNativeInts(selected))
    data.putString('maincra_daily_cycle', clock.cycle)
    data.putInt('maincra_daily_schema', global.MAINCRA_DAILY_SCHEMA)
    global.maincraDailySyncUI(server, selected)
    console.info(`[Maincra Daily] Ciclo ${clock.cycle}: ${selected.join(', ')}`)
  }
  return selected
}

global.maincraDailyReadStat = (player, name, fallback) => {
  try {
    if (name == 'getWalkDistance') return Number(player.stats.getWalkDistance())
    if (name == 'getSprintDistance') return Number(player.stats.getSprintDistance())
    if (name == 'getCrouchDistance') return Number(player.stats.getCrouchDistance())
    if (name == 'getSwimDistance') return Number(player.stats.getSwimDistance())
    if (name == 'getAnimalsBred') return Number(player.stats.getAnimalsBred())
    if (name == 'getFishCaught') return Number(player.stats.getFishCaught())
    return Number(player.stats.get(fallback))
  } catch (error) {
    return 0
  }
}

global.maincraDailyResetPlayer = player => {
  let data = player.persistentData
  let clock = global.maincraDailyClock()
  global.maincraDailyEnsureGlobal(player.server)

  data.putString('maincra_daily_cycle', clock.cycle)
  data.putInt('maincra_daily_schema', global.MAINCRA_DAILY_SCHEMA)
  data.putIntArray('maincra_daily_progress', global.maincraDailyNativeInts([0, 0, 0, 0, 0]))
  data.putInt('maincra_daily_completed_mask', 0)
  data.putInt('maincra_daily_completed_count', 0)
  data.putBoolean('maincra_daily_free_claimed', false)
  data.putBoolean('maincra_daily_three_claimed', false)
  data.putLong('maincra_daily_last_activity', Date.now())
  data.putInt('maincra_daily_active_seconds', 0)
  data.putInt('maincra_daily_walk_cm', 0)
  data.putInt('maincra_daily_swim_cm', 0)
  data.putInt('maincra_daily_xp_gained', 0)
  data.putInt('maincra_daily_last_walk', global.maincraDailyReadStat(player, 'getWalkDistance', 'minecraft:walk_one_cm')
    + global.maincraDailyReadStat(player, 'getSprintDistance', 'minecraft:sprint_one_cm')
    + global.maincraDailyReadStat(player, 'getCrouchDistance', 'minecraft:crouch_one_cm'))
  data.putInt('maincra_daily_last_swim', global.maincraDailyReadStat(player, 'getSwimDistance', 'minecraft:swim_one_cm'))
  data.putInt('maincra_daily_last_bred', global.maincraDailyReadStat(player, 'getAnimalsBred', 'minecraft:animals_bred'))
  data.putInt('maincra_daily_last_fish', global.maincraDailyReadStat(player, 'getFishCaught', 'minecraft:fish_caught'))
  data.putInt('maincra_daily_last_trade', global.maincraDailyReadStat(player, 'missing', 'minecraft:traded_with_villager'))
  data.putInt('maincra_daily_last_sleep', global.maincraDailyReadStat(player, 'missing', 'minecraft:sleep_in_bed'))
  data.putInt('maincra_daily_last_xp', Number(player.xp))
  data.putDouble('maincra_daily_last_x', player.x)
  data.putDouble('maincra_daily_last_y', player.y)
  data.putDouble('maincra_daily_last_z', player.z)
  data.putFloat('maincra_daily_last_yaw', player.yaw)
  data.putFloat('maincra_daily_last_pitch', player.pitch)
  data.putString('maincra_daily_biomes', String(player.block.biomeId))

  global.MAINCRA_DAILY_QUESTS.forEach(questId => {
    try {
      player.ftbquests.reset(questId)
    } catch (error) {
      console.error(`[Maincra Daily] No se pudo reiniciar ${questId} para ${player.username}: ${error}`)
    }
  })
}

global.maincraDailyPlayerData = player => {
  let data = player.persistentData
  let clock = global.maincraDailyClock()
  if (data.getString('maincra_daily_cycle') != clock.cycle
    || data.getInt('maincra_daily_schema') != global.MAINCRA_DAILY_SCHEMA
    || global.maincraDailyIntArray(data, 'maincra_daily_progress').length != global.MAINCRA_DAILY_SELECTION_SIZE) {
    global.maincraDailyResetPlayer(player)
  }
  return data
}

global.maincraDailyUpdateCompleted = player => {
  let data = global.maincraDailyPlayerData(player)
  let selected = global.maincraDailyEnsureGlobal(player.server)
  let progress = global.maincraDailyIntArray(data, 'maincra_daily_progress')
  let oldMask = data.getInt('maincra_daily_completed_mask')
  let mask = 0
  let count = 0
  progress.forEach((value, slot) => {
    let objective = global.maincraDailyObjective(selected[slot])
    if (objective && value >= Number(objective.goal)) {
      mask |= (1 << slot)
      count++
    }
  })
  data.putInt('maincra_daily_completed_mask', mask)
  data.putInt('maincra_daily_completed_count', Math.min(global.MAINCRA_DAILY_SELECTION_SIZE, count))

  let newlyCompleted = mask & ~oldMask
  if (newlyCompleted != 0) {
    player.tell(Text.green(`[Diarias] Objetivo completado (${count}/${global.MAINCRA_DAILY_SELECTION_SIZE}).`))
    if (count == global.MAINCRA_DAILY_THRESHOLD) {
      player.tell(Text.gold('[Diarias] Ya puedes reclamar la Case por completar 3/5.'))
    }
  }
}

global.maincraDailySet = (player, objectiveId, value) => {
  let data = global.maincraDailyPlayerData(player)
  let selected = global.maincraDailyEnsureGlobal(player.server)
  let slot = selected.indexOf(Number(objectiveId))
  if (slot < 0) return
  let objective = global.maincraDailyObjective(objectiveId)
  let progress = global.maincraDailyIntArray(data, 'maincra_daily_progress')
  progress[slot] = Math.max(progress[slot], Math.min(Number(objective.goal), Math.floor(value)))
  data.putIntArray('maincra_daily_progress', global.maincraDailyNativeInts(progress))
  global.maincraDailyUpdateCompleted(player)
}

global.maincraDailyAdd = (player, objectiveId, amount) => {
  if (!player) return
  let data = global.maincraDailyPlayerData(player)
  let selected = global.maincraDailyEnsureGlobal(player.server)
  let slot = selected.indexOf(Number(objectiveId))
  if (slot < 0) return
  let objective = global.maincraDailyObjective(objectiveId)
  let progress = global.maincraDailyIntArray(data, 'maincra_daily_progress')
  progress[slot] = Math.min(
    Number(objective.goal),
    Math.floor(progress[slot] + Math.max(0, amount))
  )
  data.putIntArray('maincra_daily_progress', global.maincraDailyNativeInts(progress))
  global.maincraDailyUpdateCompleted(player)
}

global.maincraDailyActivity = player => {
  if (!player) return
  global.maincraDailyPlayerData(player).putLong('maincra_daily_last_activity', Date.now())
}

global.maincraDailyPoll = player => {
  let data = global.maincraDailyPlayerData(player)

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

  let trades = global.maincraDailyReadStat(player, 'missing', 'minecraft:traded_with_villager')
  global.maincraDailyAdd(player, 20, Math.max(0, trades - data.getInt('maincra_daily_last_trade')))
  data.putInt('maincra_daily_last_trade', trades)

  let sleeps = global.maincraDailyReadStat(player, 'missing', 'minecraft:sleep_in_bed')
  global.maincraDailyAdd(player, 28, Math.max(0, sleeps - data.getInt('maincra_daily_last_sleep')))
  data.putInt('maincra_daily_last_sleep', sleeps)

  let xp = Number(player.xp)
  let xpDelta = Math.max(0, xp - data.getInt('maincra_daily_last_xp'))
  data.putInt('maincra_daily_last_xp', xp)
  data.putInt('maincra_daily_xp_gained', data.getInt('maincra_daily_xp_gained') + xpDelta)
  global.maincraDailySet(player, 26, data.getInt('maincra_daily_xp_gained'))

  let biome = String(player.block.biomeId)
  let biomes = data.getString('maincra_daily_biomes').split('|').filter(value => value.length > 0)
  if (!biomes.includes(biome)) {
    biomes.push(biome)
    data.putString('maincra_daily_biomes', biomes.join('|'))
  }
  global.maincraDailySet(player, 25, biomes.length)

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

global.maincraDailyShow = player => {
  let selected = global.maincraDailyEnsureGlobal(player.server)
  let data = global.maincraDailyPlayerData(player)
  let progress = global.maincraDailyIntArray(data, 'maincra_daily_progress')
  player.tell(Text.gold(`[Diarias] Reinicio: ${global.maincraDailyClock().nextLabel}`))
  selected.forEach((id, slot) => {
    let objective = global.maincraDailyObjective(id)
    player.tell(Text.gray(`${slot + 1}. ${objective.title}: ${progress[slot]}/${objective.goal}`))
  })
}

global.maincraDailyResetRejectedReward = (event, message) => {
  let player = event.player
  player.tell(Text.red(message))
  player.server.scheduleInTicks(1, () => {
    try {
      let teamData = FTBQuests.getData(player)
      if (teamData) teamData.resetReward(player.uuid, event.reward)
    } catch (error) {
      console.error(`[Maincra Daily] No se pudo reabrir la recompensa para ${player.username}: ${error}`)
    }
  })
}

global.maincraDailyClaim = (event, claimKey, requiresThreshold) => {
  let player = event.player
  let data = global.maincraDailyPlayerData(player)
  if (requiresThreshold && data.getInt('maincra_daily_completed_count') < global.MAINCRA_DAILY_THRESHOLD) {
    global.maincraDailyResetRejectedReward(event, 'Necesitas completar 3 de las 5 misiones de hoy.')
    return
  }
  if (data.getBoolean(claimKey)) {
    global.maincraDailyResetRejectedReward(event, 'Esta Case ya fue reclamada durante el ciclo actual.')
    return
  }

  data.putBoolean(claimKey, true)
  let tier = Math.min(16, global.maincraRank(player) + 1)
  try {
    player.give(Item.of('casesmod:case_item', 1, { CaseID: tier, CustomModelData: tier }))
    player.tell(Text.gold(`[Diarias] Recibiste una C${tier} Case.`))
  } catch (error) {
    data.putBoolean(claimKey, false)
    global.maincraDailyResetRejectedReward(event, 'No se pudo entregar la Case; la reclamación queda disponible.')
    console.error(`[Maincra Daily] Falló la entrega C${tier} a ${player.username}: ${error}`)
  }
}

global.MAINCRA_DAILY_SLOT_TASKS.forEach((taskId, slot) => {
  FTBQuestsEvents.customTask(taskId, event => {
    event.setCheckTimer(20)
    event.setEnableButton(true)
    event.setMaxProgress(1)
    event.setCheck((taskData, player) => {
      let data = global.maincraDailyPlayerData(player)
      let progress = global.maincraDailyIntArray(data, 'maincra_daily_progress')
      taskData.setProgress(progress[slot])
    })
  })
})

FTBQuestsEvents.customTask(global.MAINCRA_DAILY_SUMMARY_TASK, event => {
  event.setCheckTimer(20)
  event.setEnableButton(true)
  event.setMaxProgress(global.MAINCRA_DAILY_THRESHOLD)
  event.setCheck((taskData, player) => {
    taskData.setProgress(global.maincraDailyPlayerData(player).getInt('maincra_daily_completed_count'))
  })
})

FTBQuestsEvents.customTask(global.MAINCRA_DAILY_FREE_TASK, event => {
  event.setCheckTimer(20)
  event.setEnableButton(true)
  event.setMaxProgress(1)
  event.setCheck((taskData, player) => {
    global.maincraDailyPlayerData(player)
    taskData.setProgress(1)
  })
})

FTBQuestsEvents.customReward(global.MAINCRA_DAILY_FREE_REWARD, event => {
  global.maincraDailyClaim(event, 'maincra_daily_free_claimed', false)
})

FTBQuestsEvents.customReward(global.MAINCRA_DAILY_SUMMARY_REWARD, event => {
  global.maincraDailyClaim(event, 'maincra_daily_three_claimed', true)
})

EntityEvents.death(event => {
  let player = event.source.player
  if (!player || !event.entity.isMonster()) return
  global.maincraDailyActivity(player)
  global.maincraDailyAdd(player, 1, 1)
  if (event.entity.isUndead()) global.maincraDailyAdd(player, 2, 1)
  try {
    if (Utils.getMobTypeId(event.entity.mobType) == 'arthropod') global.maincraDailyAdd(player, 3, 1)
  } catch (ignored) {
    let id = String(event.entity.type)
    if (id.includes('spider') || id == 'minecraft:silverfish' || id == 'minecraft:endermite') {
      global.maincraDailyAdd(player, 3, 1)
    }
  }
  if (String(event.entity.type) == 'minecraft:creeper') global.maincraDailyAdd(player, 4, 1)

  let projectile = false
  try {
    projectile = maincraDamageTypeTags && event.source.is(maincraDamageTypeTags.IS_PROJECTILE)
  } catch (ignored) {
    let source = String(event.source)
    projectile = source.includes('arrow') || source.includes('projectile') || source.includes('trident')
  }
  if (projectile) global.maincraDailyAdd(player, 5, 1)
})

EntityEvents.hurt(event => {
  let player = event.source.player
  if (!player || !event.entity.isMonster()) return
  global.maincraDailyActivity(player)
  global.maincraDailyAdd(player, 6, Math.min(Number(event.damage), Number(event.entity.health)))
})

BlockEvents.broken(event => {
  let player = event.player
  if (!player) return
  global.maincraDailyActivity(player)
  let id = String(event.block.id)
  let tags = tag => event.block.hasTag(tag)

  if (id == 'minecraft:stone' || id == 'minecraft:deepslate'
    || id == 'minecraft:cobbled_deepslate' || id == 'minecraft:cobblestone') {
    global.maincraDailyAdd(player, 7, 1)
  }
  if (tags('forge:ores')) global.maincraDailyAdd(player, 8, 1)
  if (tags('forge:ores/coal') || id == 'minecraft:coal_ore' || id == 'minecraft:deepslate_coal_ore') {
    global.maincraDailyAdd(player, 9, 1)
  }
  if (tags('forge:ores/iron') || tags('forge:ores/copper')
    || id == 'minecraft:iron_ore' || id == 'minecraft:deepslate_iron_ore'
    || id == 'minecraft:copper_ore' || id == 'minecraft:deepslate_copper_ore') {
    global.maincraDailyAdd(player, 10, 1)
  }
  if (tags('minecraft:logs')) global.maincraDailyAdd(player, 11, 1)
  if (id == 'minecraft:sand' || id == 'minecraft:red_sand'
    || id == 'minecraft:gravel' || id == 'minecraft:clay') {
    global.maincraDailyAdd(player, 12, 1)
  }
  let maxAge = MAINCRA_DAILY_CROP_MAX_AGE[id]
  if (maxAge != null && Number(event.block.properties.get('age')) >= maxAge) {
    global.maincraDailyAdd(player, 13, 1)
  }
  global.maincraDailyAdd(player, 29, 1)
})

BlockEvents.placed(event => {
  let player = event.player
  if (!player) return
  global.maincraDailyActivity(player)
  let id = String(event.block.id)
  if (MAINCRA_DAILY_PLANTS.has(id)) global.maincraDailyAdd(player, 14, 1)
  global.maincraDailyAdd(player, 21, 1)
  if (id == 'minecraft:torch' || id == 'minecraft:wall_torch'
    || id == 'minecraft:soul_torch' || id == 'minecraft:soul_wall_torch') {
    global.maincraDailyAdd(player, 22, 1)
  }
})

ItemEvents.entityInteracted('minecraft:shears', event => {
  let player = event.player
  if (!player || String(event.target.type) != 'minecraft:sheep') return
  try {
    if (event.target.isSheared() || event.target.isBaby()) return
  } catch (ignored) {
    // The interaction itself remains a safe fallback if another mod wraps Sheep.
  }
  global.maincraDailyActivity(player)
  global.maincraDailyAdd(player, 16, 1)
})

ItemEvents.smelted(event => {
  global.maincraDailyActivity(event.player)
  global.maincraDailyAdd(event.player, 18, Number(event.item.count))
})

ItemEvents.foodEaten(event => {
  global.maincraDailyActivity(event.player)
  global.maincraDailyAdd(event.player, 19, 1)
})

ItemEvents.crafted(event => {
  global.maincraDailyActivity(event.player)
  let count = Number(event.item.count)
  global.maincraDailyAdd(event.player, 27, count)
  if (String(event.item.id) == 'minecraft:torch' || String(event.item.id) == 'minecraft:soul_torch') {
    global.maincraDailyAdd(event.player, 22, count)
  }
})

PlayerEvents.loggedIn(event => {
  global.maincraDailyPlayerData(event.player)
  event.server.scheduleInTicks(40, () => global.maincraDailyShow(event.player))
})

PlayerEvents.tick(event => {
  if (event.player.age % 20 == 0) global.maincraDailyPoll(event.player)
})

let maincraDailyServerTicks = 0
ServerEvents.tick(event => {
  maincraDailyServerTicks++
  if (maincraDailyServerTicks % 20 == 0) global.maincraDailyEnsureGlobal(event.server)
})

ServerEvents.loaded(event => {
  event.server.scheduleInTicks(20, () => {
    let selected = global.maincraDailyEnsureGlobal(event.server)
    global.maincraDailySyncUI(event.server, selected)
  })
})
