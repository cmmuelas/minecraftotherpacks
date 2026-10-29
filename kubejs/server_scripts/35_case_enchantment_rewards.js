// Canje de los tokens de libros encantados entregados por CasesMod.
// El token existe porque la configuración de CasesMod no puede guardar NBT por recompensa.

const MAINCRA_CASE_ENCHANTMENT_REWARDS = {
  'kubejs:case_book_mending': ['minecraft:mending', 1],
  'kubejs:case_book_fortune_3': ['minecraft:fortune', 3],
  'kubejs:case_book_looting_3': ['minecraft:looting', 3],
  'kubejs:case_book_efficiency_5': ['minecraft:efficiency', 5],
  'kubejs:case_book_protection_4': ['minecraft:protection', 4],
  'kubejs:case_book_sharpness_5': ['minecraft:sharpness', 5]
}

Object.entries(MAINCRA_CASE_ENCHANTMENT_REWARDS).forEach(([rewardItem, reward]) => {
  ItemEvents.rightClicked(rewardItem, event => {
    const enchantmentId = reward[0]
    const level = reward[1]

    event.item.count--
    event.player.give(Item.of(
      'minecraft:enchanted_book',
      `{StoredEnchantments:[{id:"${enchantmentId}",lvl:${level}s}]}`
    ))
  })
})
