// Maincra progression core - KubeJS 6 / Forge 1.20.1
// Source of truth: persistent player data. Exploration, drops and item use are never blocked.

// Orden único del Camino del Cazador. Los IDs de misión y tarea pertenecen a la posición.
global.MAINCRA_BOSSES = [
  { rank: 0, quest: '2BF4019CBDC93589', task: '40DE4F570C79C72B', id: 'mowziesmobs:ferrous_wroughtnaut', name: 'Ferrous Wroughtnaut', icon: 'mowziesmobs:wroughtnaut_spawn_egg' },
  { rank: 1, quest: '0EE236707AAF6FF2', task: '74918E16B7EA7590', id: 'majruszsdifficulty:tank', name: 'Tank', icon: 'majruszsdifficulty:tank_spawn_egg' },
  { rank: 2, quest: '3774BE4AB10E22A3', task: '6306970C4971ED9E', id: 'minecraft:elder_guardian', name: 'Elder Guardian', icon: 'minecraft:elder_guardian_spawn_egg' },
  { rank: 3, quest: '1C0C48AFFD05D092', task: '6D00F3372E2A5842', id: 'aquamirae:maze_mother', name: 'Mother of the Maze', icon: 'aquamirae:maze_mother_spawn_egg' },
  { rank: 4, quest: '20E9752E35BF9A59', task: '58CF8E8DCE25C328', id: 'irons_spellbooks:citadel_keeper', name: 'Ancient Knight', icon: 'irons_spellbooks:keeper_spawn_egg' },
  { rank: 5, quest: '47F6CC140750E9F4', task: '255D29E64C358219', id: 'mowziesmobs:umvuthi', name: 'Umvuthi, the Sunbird', icon: 'mowziesmobs:umvuthi_spawn_egg' },
  { rank: 6, quest: '3900DAD14F024F45', task: '6E61E2B7EBE0BA30', id: 'majruszsdifficulty:cerberus', name: 'Cerberus', icon: 'majruszsdifficulty:cerberus_spawn_egg' },
  { rank: 7, quest: '47D15507B6550BDA', task: '3461E80568CFF695', id: 'aquamirae:captain_cornelia', name: 'Ghost of Captain Cornelia', icon: 'aquamirae:captain_cornelia_spawn_egg' },
  { rank: 8, quest: '76B2B40795BFB50A', task: '5901F0DE4615473A', id: 'minecraft:ender_dragon', name: 'Ender Dragon', icon: 'minecraft:dragon_egg' },
  { rank: 9, quest: '7CD780277DC72587', task: '7096CCCB1ED18AC2', id: 'majruszsdifficulty:giant', name: 'Giant', icon: 'majruszsdifficulty:giant_spawn_egg' },
  { rank: 10, quest: '1A9E540452D99245', task: '16DD82E02AE50565', id: 'mowziesmobs:frostmaw', name: 'Frostmaw', icon: 'mowziesmobs:frostmaw_spawn_egg' },
  { rank: 11, quest: '15E926223FEC7142', task: '0091B3C9EB306F7D', id: 'minecraft:wither', name: 'Wither', icon: 'minecraft:wither_skeleton_skull' },
  { rank: 12, quest: '507523AB155CA627', task: '64D8D6BAB5398D80', id: 'irons_spellbooks:dead_king', name: 'The Dead King', icon: 'irons_spellbooks:dead_king_corpse_spawn_egg' },
  { rank: 13, quest: '509FE7FB4B435B95', task: '721DC07063E6C5B3', id: 'minecraft:warden', name: 'Warden', icon: 'minecraft:warden_spawn_egg' },
  { rank: 14, quest: '7E09EFA915991E3B', task: '35B9214BF7D0997D', id: 'graveyard:lich', name: 'Corrupted Champion', icon: 'graveyard:upper_bone_staff' },
  { rank: 15, quest: '0B612BD224C52FC5', task: '6781036AD367703F', id: 'irons_spellbooks:fire_boss', name: 'Echo of Tyros', icon: 'irons_spellbooks:cinderous_soulcaller' }
]

global.MAINCRA_BOSS_REQUIREMENTS = {
  0: ['maincra_arcane', 1, 'Artes Arcanas: completa la iniciación mágica'],
  1: ['maincra_ocean', 1, 'Océano: consigue equipo básico de respiración'],
  2: ['maincra_ocean', 2, 'Océano: completa la preparación del monumento'],
  7: ['maincra_ocean', 3, 'Océano: investiga el Ice Maze y consigue el Shell Horn'],
  9: ['maincra_explorer', 2, 'Exploración: avanza en la búsqueda de los ojos'],
  12: ['maincra_arcane', 3, 'Artes Arcanas: alcanza magia épica'],
  13: ['maincra_explorer', 1, 'Exploración: encuentra una Ancient City'],
  14: ['maincra_funeral', 3, 'Rama funeraria: reúne los fragmentos y prepara el ritual'],
  15: ['maincra_arcane', 5, 'Artes Arcanas: consigue el Cinderous Soulcaller']
}

global.MAINCRA_BRANCH_LIMITS = {
  maincra_arcane: 5,
  maincra_ocean: 4,
  maincra_engineering: 4,
  maincra_funeral: 4,
  maincra_home: 2,
  maincra_explorer: 3
}

global.maincraData = player => {
  let data = player.persistentData
  let hadLegacyProgress = data.contains('maincra_rank')
    || data.contains('maincra_arcane')
    || data.contains('maincra_ocean')
    || data.contains('maincra_engineering')
    || data.contains('maincra_funeral')
    || data.contains('maincra_home')
    || data.contains('maincra_explorer')
  if (!data.contains('maincra_rank')) data.putInt('maincra_rank', 0)
  if (!data.contains('maincra_arcane')) data.putInt('maincra_arcane', 0)
  if (!data.contains('maincra_ocean')) data.putInt('maincra_ocean', 0)
  if (!data.contains('maincra_engineering')) data.putInt('maincra_engineering', 0)
  if (!data.contains('maincra_funeral')) data.putInt('maincra_funeral', 0)
  if (!data.contains('maincra_home')) data.putInt('maincra_home', 0)
  if (!data.contains('maincra_explorer')) data.putInt('maincra_explorer', 0)
  if (!data.contains('maincra_progression_version')) {
    data.putInt('maincra_progression_version', hadLegacyProgress ? 0 : 2)
  }
  return data
}

global.maincraRank = player => global.maincraData(player).getInt('maincra_rank')

// FTB XMod Compat 2.1.3 expone un binding global estable. No dependemos de la
// propiedad adjunta player.ftbquests, que no aparece en todos los contextos de KubeJS.
global.maincraFtbData = player => {
  let ftbData = FTBQuests.getServerDataFromPlayer(player)
  if (!ftbData) throw new Error(`FTB Quests no devolvió datos para ${player.username}`)
  return ftbData
}

global.maincraQuestCompleted = (player, questId) => {
  try {
    return global.maincraFtbData(player).isCompleted(questId)
  } catch (error) {
    console.error(`[Maincra] No se pudo consultar FTB Quests ${questId} para ${player.username}: ${error}`)
    return false
  }
}

global.maincraVerifiedBranchLevel = (player, branchKey) => {
  let milestones = global.MAINCRA_BRANCH_MILESTONES || {}
  let ordered = Object.entries(milestones)
    .filter(entry => entry[1][0] == branchKey)
    .sort((a, b) => a[1][1] - b[1][1])
  let verified = 0
  ordered.forEach(entry => {
    let level = entry[1][1]
    if (level == verified + 1 && global.maincraQuestCompleted(player, entry[0])) verified = level
  })
  return verified
}

// Solo eleva niveles desde misiones realmente completadas. Nunca reduce datos
// heredados ni usa inventario, drops o tareas todavía bloqueadas.
global.maincraReconcileBranches = (player, apply) => {
  let data = global.maincraData(player)
  let changes = []
  let warnings = []
  let keys = Object.keys(global.MAINCRA_BRANCH_LIMITS)
  keys.forEach(key => {
    let stored = data.getInt(key)
    let verified = global.maincraVerifiedBranchLevel(player, key)
    if (stored < verified) {
      changes.push(`${key}: ${stored} -> ${verified}`)
      if (apply) data.putInt(key, verified)
    } else if (stored > verified) {
      warnings.push(`${key}: nivel ${stored} no verificable por misiones (verificado ${verified}); no se reduce automáticamente`)
    }
  })
  return { changes: changes, warnings: warnings }
}

global.maincraAuditPlayer = (player, apply) => {
  let data = global.maincraData(player)
  let changes = []
  let warnings = []
  let rank = data.getInt('maincra_rank')
  let personalQuestData = false
  let ftbData = null
  try {
    ftbData = global.maincraFtbData(player)
    personalQuestData = String(ftbData.getData().getTeamId()) == String(player.uuid)
    if (!personalQuestData) {
      warnings.push('FTB Quests comparte esta interfaz con una party; el rango individual puede diferir. Usa equipos personales para el Camino.')
    }
  } catch (error) {
    warnings.push(`no se pudo auditar el equipo de FTB Quests: ${error}`)
  }
  if (rank < 0 || rank > 16) {
    let corrected = Math.max(0, Math.min(16, rank))
    warnings.push(`rango fuera de límites C${rank}`)
    if (apply) {
      data.putInt('maincra_rank', corrected)
      changes.push(`maincra_rank: ${rank} -> ${corrected}`)
      rank = corrected
    }
  }

  let branchResult = global.maincraReconcileBranches(player, apply)
  branchResult.changes.forEach(change => changes.push(change))
  branchResult.warnings.forEach(warning => warnings.push(warning))

  global.MAINCRA_BOSSES.forEach(boss => {
    let completed = global.maincraQuestCompleted(player, boss.quest)
    if (boss.rank < rank && !completed) {
      if (apply && ftbData) {
        ftbData.complete(boss.quest)
        changes.push(`FTB: completada ${boss.name} desde rango interno C${rank}`)
      } else {
        warnings.push(`FTB no marca ${boss.name}, aunque el rango interno es C${rank}`)
      }
    } else if (boss.rank >= rank && completed) {
      if (apply && personalQuestData && ftbData) {
        ftbData.reset(boss.quest)
        changes.push(`FTB: reiniciada ${boss.name}, adelantada respecto a C${rank}`)
      } else {
        warnings.push(`FTB marca ${boss.name}, pero el rango individual sigue en C${rank}; no se concede rango${personalQuestData ? '' : ' ni se modifica una party'}`)
      }
    }
  })

  if (apply) {
    data.putInt('maincra_progression_version', 2)
    global.maincraSyncProgress(player)
  }
  return { rank: rank, changes: changes, warnings: warnings }
}

// Send the current progression to the client. Dynamic tooltips use this packet so
// restrictions disappear as soon as the player satisfies them.
global.maincraSyncProgress = player => {
  if (!player) return
  let data = global.maincraData(player)
  player.sendData('maincra_progress', {
    rank: data.getInt('maincra_rank'),
    arcane: data.getInt('maincra_arcane'),
    ocean: data.getInt('maincra_ocean'),
    engineering: data.getInt('maincra_engineering'),
    funeral: data.getInt('maincra_funeral'),
    home: data.getInt('maincra_home'),
    explorer: data.getInt('maincra_explorer')
  })
}

global.maincraCanAdvance = (player, defeatedRank) => {
  // Cierra la carrera entre el evento de FTB Quests y la muerte del jefe.
  global.maincraReconcileBranches(player, true)
  let requirement = global.MAINCRA_BOSS_REQUIREMENTS[defeatedRank]
  if (!requirement) return true
  let data = global.maincraData(player)
  if (data.getInt(requirement[0]) >= requirement[1]) return true
  player.tell(Text.red('[Maincra] El jefe ha sido derrotado, pero faltaba: ' + requirement[2] + '.'))
  player.tell(Text.gray('Conservas todos los drops, pero tendrás que repetir el combate cuando cumplas el requisito.'))
  return false
}

global.maincraAdvance = (player, defeatedRank) => {
  let data = global.maincraData(player)
  let current = data.getInt('maincra_rank')
  if (current != defeatedRank) return false
  if (!global.maincraCanAdvance(player, defeatedRank)) return false

  data.putInt('maincra_rank', Math.min(16, current + 1))
  global.maincraSyncProgress(player)
  player.tell(Text.gold('[Maincra] ').append(Text.green(`Rango C${current + 1} desbloqueado.`)))
  if (current + 1 < 16) player.tell(Text.gray(`Siguiente caza: ${global.MAINCRA_BOSSES[current + 1].name}`))
  else player.tell(Text.lightPurple('Has completado el Camino del Cazador.'))
  return true
}

PlayerEvents.loggedIn(event => {
  let player = event.player
  let rank = global.maincraRank(player)
  player.tell(Text.gold('[Maincra] ').append(Text.gray(`Camino del Cazador: C${rank}`)))
  if (rank < 16) player.tell(Text.gray(`Objetivo actual: ${global.MAINCRA_BOSSES[rank].name}`))
  if (global.maincraData(player).getInt('maincra_progression_version') < 2) {
    player.tell(Text.yellow('[Maincra] Datos de progresión anteriores detectados. Un operador puede usar /maincra audit y /maincra reconcile.'))
  }
  event.server.scheduleInTicks(20, () => global.maincraSyncProgress(player))
  event.server.scheduleInTicks(40, () => {
    let recovered = global.maincraReconcileBranches(player, true)
    if (recovered.changes.length > 0) {
      global.maincraSyncProgress(player)
      player.tell(Text.aqua('[Maincra] Se recuperaron hitos temáticos desde misiones FTB completadas.'))
    }
  })
})

// A low-frequency refresh also covers client resource reloads without flooding the network.
PlayerEvents.tick(event => {
  if (event.player.age % 200 == 0) global.maincraSyncProgress(event.player)
})
