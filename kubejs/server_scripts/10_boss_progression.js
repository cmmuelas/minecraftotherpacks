// Avance lineal del Camino del Cazador.
// Cada jefe se registra por su EntityType exacto y cada jugador cercano acredita
// la tarea en su propio equipo de FTB Quests.

const MAINCRA_BOSS_CREDIT_RADIUS_SQ = 100 * 100

// Usa el binding global de FTB XMod Compat. La propiedad player.ftbquests no está
// disponible en todos los contextos de KubeJS, incluidos algunos comandos.
global.maincraCompleteBossTask = (player, boss) => {
  try {
    let ftbData = global.maincraFtbData(player)
    if (ftbData.isCompleted(boss.task)) return true

    let accepted = ftbData.addProgress(boss.task, 1)
    if (!accepted) {
      player.tell(Text.red(`[Maincra] Se detectó la muerte de ${boss.name}, pero su misión no estaba activa o la tarea no pudo iniciarse.`))
      console.warn(`[Maincra] addProgress rechazó ${boss.task} (${boss.name}) para ${player.username}.`)
      return false
    }

    let progress = ftbData.getTaskProgress(boss.task)
    let completed = ftbData.isCompleted(boss.task) || progress >= 1
    if (!completed) {
      player.tell(Text.red(`[Maincra] FTB Quests aceptó la muerte de ${boss.name}, pero no guardó el progreso.`))
      console.error(`[Maincra] La tarea ${boss.task} quedó con progreso ${progress} para ${player.username}.`)
      return false
    }

    console.info(`[Maincra] Tarea de ${boss.name} acreditada a ${player.username}.`)
    return true
  } catch (error) {
    let detail = String(error)
    console.error(`[Maincra] Error acreditando ${boss.name} para ${player.username}: ${detail}`)
    player.tell(Text.red(`[Maincra] Error al acreditar ${boss.name}: ${detail}`))
    return false
  }
}

global.maincraCreditBossKill = (player, boss) => {
  if (!player || !global.maincraCompleteBossTask(player, boss)) return false

  let currentRank = global.maincraRank(player)
  if (currentRank == boss.rank) {
    if (!global.maincraAdvance(player, boss.rank)) {
      player.tell(Text.yellow(`[Maincra] La muerte de ${boss.name} quedó guardada, pero el rango no avanzó por un requisito temático.`))
    }
  } else {
    player.tell(Text.yellow(`[Maincra] La muerte de ${boss.name} quedó guardada. Tu rango interno es C${currentRank} y esta posición corresponde a C${boss.rank}.`))
    console.warn(`[Maincra] Desincronización para ${player.username}: ${boss.name}, rango C${currentRank}, posición C${boss.rank}.`)
  }

  return true
}

global.maincraHandleBossDeath = (event, boss) => {
  console.info(`[Maincra] Muerte detectada: ${boss.name} (${boss.id}).`)

  let ex = event.entity.x
  let ey = event.entity.y
  let ez = event.entity.z
  let dimension = String(event.entity.level.dimension)
  let processed = {}

  event.server.players.forEach(player => {
    if (String(player.level.dimension) != dimension) return

    let dx = player.x - ex
    let dy = player.y - ey
    let dz = player.z - ez
    if ((dx * dx + dy * dy + dz * dz) > MAINCRA_BOSS_CREDIT_RADIUS_SQ) return

    processed[String(player.uuid)] = true
    global.maincraCreditBossKill(player, boss)
  })

  let killer = event.source.player
  if (killer && !processed[String(killer.uuid)]) global.maincraCreditBossKill(killer, boss)
}

global.MAINCRA_BOSSES.forEach(boss => {
  EntityEvents.death(boss.id, event => global.maincraHandleBossDeath(event, boss))
})

console.info(`[Maincra] Registrados ${global.MAINCRA_BOSSES.length} jefes con crédito individual en 100 bloques.`)
