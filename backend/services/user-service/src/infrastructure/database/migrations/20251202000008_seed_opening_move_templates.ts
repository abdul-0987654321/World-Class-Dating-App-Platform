import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const templates = [
    // Interests & Passions (5 templates)
    {
      category: 'interests',
      content: "What's something you're passionate about?",
      is_system: true,
      active: true,
    },
    {
      category: 'interests',
      content: "What's your hidden talent?",
      is_system: true,
      active: true,
    },
    {
      category: 'interests',
      content: 'Tell me about your favorite hobby and why you love it',
      is_system: true,
      active: true,
    },
    {
      category: 'interests',
      content: "What's the most interesting thing you've learned recently?",
      is_system: true,
      active: true,
    },
    {
      category: 'interests',
      content: 'If you could master any skill instantly, what would it be?',
      is_system: true,
      active: true,
    },

    // Date Ideas (5 templates)
    {
      category: 'date_ideas',
      content: "What's your idea of a perfect first date?",
      is_system: true,
      active: true,
    },
    {
      category: 'date_ideas',
      content: 'Coffee, drinks, or adventure for a first date?',
      is_system: true,
      active: true,
    },
    {
      category: 'date_ideas',
      content: "What's the most creative date you've ever been on?",
      is_system: true,
      active: true,
    },
    {
      category: 'date_ideas',
      content: 'Would you rather have dinner at a fancy restaurant or a picnic at sunset?',
      is_system: true,
      active: true,
    },
    {
      category: 'date_ideas',
      content: "What's your go-to date night activity?",
      is_system: true,
      active: true,
    },

    // Travel & Adventure (5 templates)
    {
      category: 'travel',
      content: 'Tell me about your most memorable travel experience',
      is_system: true,
      active: true,
    },
    {
      category: 'travel',
      content: "What's on your travel bucket list?",
      is_system: true,
      active: true,
    },
    {
      category: 'travel',
      content: 'Beach vacation or mountain adventure?',
      is_system: true,
      active: true,
    },
    {
      category: 'travel',
      content: "What's the best meal you've ever had while traveling?",
      is_system: true,
      active: true,
    },
    {
      category: 'travel',
      content: 'If you could teleport anywhere right now, where would you go?',
      is_system: true,
      active: true,
    },

    // Fun & Lighthearted (5 templates)
    {
      category: 'fun',
      content: 'What made you swipe right on me?',
      is_system: true,
      active: true,
    },
    {
      category: 'fun',
      content: "What's your karaoke song?",
      is_system: true,
      active: true,
    },
    {
      category: 'fun',
      content: 'Pineapple on pizza: yes or absolutely not?',
      is_system: true,
      active: true,
    },
    {
      category: 'fun',
      content: "What's the best compliment you've ever received?",
      is_system: true,
      active: true,
    },
    {
      category: 'fun',
      content: 'If you were a superhero, what would your superpower be?',
      is_system: true,
      active: true,
    },

    // Deep Conversation (5 templates)
    {
      category: 'conversation',
      content: "What's something that always makes you smile?",
      is_system: true,
      active: true,
    },
    {
      category: 'conversation',
      content: "What's a goal you're working towards right now?",
      is_system: true,
      active: true,
    },
    {
      category: 'conversation',
      content: 'What does your perfect weekend look like?',
      is_system: true,
      active: true,
    },
    {
      category: 'conversation',
      content: "What's the best advice you've ever received?",
      is_system: true,
      active: true,
    },
    {
      category: 'conversation',
      content: 'If you could have dinner with anyone, dead or alive, who would it be?',
      is_system: true,
      active: true,
    },

    // Food & Drink (3 templates)
    {
      category: 'food',
      content: "What's your signature dish or favorite thing to cook?",
      is_system: true,
      active: true,
    },
    {
      category: 'food',
      content: "What's your comfort food?",
      is_system: true,
      active: true,
    },
    {
      category: 'food',
      content: 'Breakfast for dinner or dinner for breakfast?',
      is_system: true,
      active: true,
    },

    // Entertainment (2 templates)
    {
      category: 'entertainment',
      content: "What's the last show you binge-watched?",
      is_system: true,
      active: true,
    },
    {
      category: 'entertainment',
      content: 'What movie could you watch over and over?',
      is_system: true,
      active: true,
    },
  ];

  await knex('opening_move_templates').insert(templates);
}

export async function down(knex: Knex): Promise<void> {
  await knex('opening_move_templates').where('is_system', true).delete();
}
