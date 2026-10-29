// Comandos de diagnóstico y pruebas. Requieren nivel de operador 2.
// /maincra status
// /maincra setrank <0-16>
// /maincra setbranch <arcane|ocean|engineering|funeral|home|explorer> <0-5>
// /maincra audit [jugador]
// /maincra reconcile [jugador]
// /maincra creditboss <0-15> [jugador]
// /maincra reset

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event

  function syncAndConfirm(player, message) {
    global.maincraSyncProgress(player)
    player.tell(message)
    return 1
  }

  function branchQuestFor(requirement) {
    let result = null
    Object.entries(global.MAINCRA_BRANCH_MILESTONES).forEach(entry => {
      if (entry[1][0] == requirement[0] && entry[1][1] == requirement[1]) result = entry[0]
    })
    return result
  }

  function reportAudit(viewer, target, apply) {
    let result = global.maincraAuditPlayer(target, apply)
    let data = global.maincraData(target)
    viewer.tell(Text.gold(`[Maincra] ${apply ? 'Reconciliación' : 'Auditoría'} de ${target.username}`))
    viewer.tell(Text.gray(`Rango individual: C${data.getInt('maincra_rank')}`))
    viewer.tell(Text.gray(`Arcano ${data.getInt('maincra_arcane')} | Océano ${data.getInt('maincra_ocean')} | Ingeniería ${data.getInt('maincra_engineering')}`))
    viewer.tell(Text.gray(`Funerario ${data.getInt('maincra_funeral')} | Hogar ${data.getInt('maincra_home')} | Explorador ${data.getInt('maincra_explorer')}`))
    let completedBosses = global.MAINCRA_BOSSES
      .filter(boss => global.maincraQuestCompleted(target, boss.quest))
      .map(boss => boss.name)
    viewer.tell(Text.gray(`Jefes marcados en FTB: ${completedBosses.length > 0 ? completedBosses.join(', ') : 'ninguno'}`))

    Object.entries(global.MAINCRA_BOSS_REQUIREMENTS).forEach(entry => {
      let boss = global.MAINCRA_BOSSES[Number(entry[0])]
      let requirement = entry[1]
      let questId = branchQuestFor(requirement)
      let visual = questId && global.maincraQuestCompleted(target, questId)
      let internal = data.getInt(requirement[0]) >= requirement[1]
      viewer.tell(Text.gray(`${boss.name}: misión temática ${visual ? 'sí' : 'no'}, nivel interno ${internal ? 'sí' : 'no'}`))
    })

    result.changes.forEach(change => viewer.tell(Text.green(`Corregido: ${change}`)))
    result.warnings.forEach(warning => viewer.tell(Text.yellow(`Aviso: ${warning}`)))
    if (result.changes.length == 0) viewer.tell(Text.gray('Sin correcciones seguras pendientes.'))
    if (apply) viewer.tell(Text.aqua('No se concedieron rangos ni se usaron objetos del inventario.'))
    return 1
  }

  function creditBoss(viewer, target, rank) {
    rank = Math.max(0, Math.min(15, rank))
    let boss = global.MAINCRA_BOSSES[rank]
    viewer.tell(Text.gold(`[Maincra] Acreditando ${boss.name} a ${target.username} mediante la misma ruta usada por una muerte real.`))
    let credited = global.maincraCreditBossKill(target, boss)
    if (credited) {
      viewer.tell(Text.green(`[Maincra] ${boss.name} acreditado correctamente a ${target.username}.`))
      return 1
    }
    viewer.tell(Text.red(`[Maincra] No se pudo acreditar ${boss.name}. El jugador recibirá el motivo exacto en el chat.`))
    return 0
  }

  event.register(
    Commands.literal('maincra')
      .requires(source => source.hasPermission(2))
      .then(Commands.literal('status').executes(ctx => {
        let player = ctx.source.player
        let data = global.maincraData(player)
        player.tell(Text.gold('[Maincra] Estado de pruebas'))
        player.tell(Text.gray(`Rango: C${data.getInt('maincra_rank')}`))
        player.tell(Text.gray(`Arcano ${data.getInt('maincra_arcane')} | Océano ${data.getInt('maincra_ocean')} | Ingeniería ${data.getInt('maincra_engineering')}`))
        player.tell(Text.gray(`Funerario ${data.getInt('maincra_funeral')} | Hogar ${data.getInt('maincra_home')} | Explorador ${data.getInt('maincra_explorer')}`))
        global.maincraSyncProgress(player)
        return 1
      }))
      .then(Commands.literal('reset').executes(ctx => {
        let player = ctx.source.player
        let data = global.maincraData(player)
        data.putInt('maincra_rank', 0)
        data.putInt('maincra_arcane', 0)
        data.putInt('maincra_ocean', 0)
        data.putInt('maincra_engineering', 0)
        data.putInt('maincra_funeral', 0)
        data.putInt('maincra_home', 0)
        data.putInt('maincra_explorer', 0)
        data.putInt('maincra_progression_version', 2)
        return syncAndConfirm(player, Text.red('[Maincra] Progreso de pruebas reiniciado.'))
      }))
      .then(Commands.literal('audit')
        .executes(ctx => reportAudit(ctx.source.player, ctx.source.player, false))
        .then(Commands.argument('player', Arguments.PLAYER.create(event))
          .executes(ctx => reportAudit(
            ctx.source.player,
            Arguments.PLAYER.getResult(ctx, 'player'),
            false
          ))
        )
      )
      .then(Commands.literal('reconcile')
        .executes(ctx => reportAudit(ctx.source.player, ctx.source.player, true))
        .then(Commands.argument('player', Arguments.PLAYER.create(event))
          .executes(ctx => reportAudit(
            ctx.source.player,
            Arguments.PLAYER.getResult(ctx, 'player'),
            true
          ))
        )
      )
      .then(Commands.literal('creditboss')
        .then(Commands.argument('rank', Arguments.INTEGER.create(event))
          .executes(ctx => creditBoss(
            ctx.source.player,
            ctx.source.player,
            Arguments.INTEGER.getResult(ctx, 'rank')
          ))
          .then(Commands.argument('player', Arguments.PLAYER.create(event))
            .executes(ctx => creditBoss(
              ctx.source.player,
              Arguments.PLAYER.getResult(ctx, 'player'),
              Arguments.INTEGER.getResult(ctx, 'rank')
            ))
          )
        )
      )
      .then(Commands.literal('setrank')
        .then(Commands.argument('rank', Arguments.INTEGER.create(event))
          .executes(ctx => {
            let player = ctx.source.player
            let rank = Arguments.INTEGER.getResult(ctx, 'rank')
            rank = Math.max(0, Math.min(16, rank))
            global.maincraData(player).putInt('maincra_rank', rank)
            return syncAndConfirm(player, Text.green(`[Maincra] Rango de pruebas establecido en C${rank}.`))
          })
        )
      )
      .then(Commands.literal('setbranch')
        .then(Commands.argument('branch', Arguments.STRING.create(event))
          .then(Commands.argument('level', Arguments.INTEGER.create(event))
            .executes(ctx => {
              let player = ctx.source.player
              let branch = String(Arguments.STRING.getResult(ctx, 'branch')).toLowerCase()
              let keys = {
                arcane: 'maincra_arcane',
                ocean: 'maincra_ocean',
                engineering: 'maincra_engineering',
                funeral: 'maincra_funeral',
                home: 'maincra_home',
                explorer: 'maincra_explorer'
              }
              let key = keys[branch]
              if (!key) {
                player.tell(Text.red('[Maincra] Rama desconocida. Usa arcane, ocean, engineering, funeral, home o explorer.'))
                return 0
              }
              let level = Math.max(
                0,
                Math.min(
                  global.MAINCRA_BRANCH_LIMITS[key],
                  Arguments.INTEGER.getResult(ctx, 'level')
                )
              )
              global.maincraData(player).putInt(key, level)
              return syncAndConfirm(player, Text.green(`[Maincra] ${branch} establecido en ${level}.`))
            })
          )
        )
      )
  )
})
