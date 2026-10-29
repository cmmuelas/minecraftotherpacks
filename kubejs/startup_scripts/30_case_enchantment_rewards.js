// Premios especiales de CasesMod que representan libros encantados concretos.
// CasesMod solo admite un ID de objeto en cada entrada de loot, sin NBT.
// Estos tokens usan la textura del libro encantado y se canjean por el libro real
// mediante kubejs/server_scripts/35_case_enchantment_rewards.js.

StartupEvents.registry('item', event => {
  event.create('case_book_mending')
    .displayName('Libro encantado: Reparación')
    .texture('minecraft:item/enchanted_book')
    .maxStackSize(1)
    .glow(true)

  event.create('case_book_fortune_3')
    .displayName('Libro encantado: Fortuna III')
    .texture('minecraft:item/enchanted_book')
    .maxStackSize(1)
    .glow(true)

  event.create('case_book_looting_3')
    .displayName('Libro encantado: Saqueo III')
    .texture('minecraft:item/enchanted_book')
    .maxStackSize(1)
    .glow(true)

  event.create('case_book_efficiency_5')
    .displayName('Libro encantado: Eficiencia V')
    .texture('minecraft:item/enchanted_book')
    .maxStackSize(1)
    .glow(true)

  event.create('case_book_protection_4')
    .displayName('Libro encantado: Protección IV')
    .texture('minecraft:item/enchanted_book')
    .maxStackSize(1)
    .glow(true)

  event.create('case_book_sharpness_5')
    .displayName('Libro encantado: Filo V')
    .texture('minecraft:item/enchanted_book')
    .maxStackSize(1)
    .glow(true)
})
