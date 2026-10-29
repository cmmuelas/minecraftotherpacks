// Botín progresivo general de cofres.
// Nunca sustituye drops de jefes ni materiales exclusivos; añade pequeñas posibilidades
// según el rango del jugador que genera el botín.

LootJS.modifiers(event => {
  event.addLootTypeModifier(LootType.CHEST)
    .playerPredicate(player => global.maincraRank(player) >= 1)
    .randomChance(0.18)
    .addLoot('minecraft:gold_ingot')

  event.addLootTypeModifier(LootType.CHEST)
    .playerPredicate(player => global.maincraRank(player) >= 3)
    .randomChance(0.10)
    .addLoot('minecraft:experience_bottle')

  event.addLootTypeModifier(LootType.CHEST)
    .playerPredicate(player => global.maincraRank(player) >= 6)
    .randomChance(0.06)
    .addLoot('minecraft:diamond')

  event.addLootTypeModifier(LootType.CHEST)
    .playerPredicate(player => global.maincraRank(player) >= 9)
    .randomChance(0.025)
    .addLoot('minecraft:ancient_debris')

  event.addLootTypeModifier(LootType.CHEST)
    .playerPredicate(player => global.maincraRank(player) >= 13)
    .randomChance(0.03)
    .addLoot('irons_spellbooks:epic_ink')

  event.addLootTypeModifier(LootType.CHEST)
    .playerPredicate(player => global.maincraRank(player) >= 15)
    .randomChance(0.0125)
    .addLoot('irons_spellbooks:legendary_ink')
})
