import { NextResponse } from 'next/server';

export const revalidate = 3600;

// Planning S37→S51 — production réelle du projet (10 050 unités)
const PLANNING = [
  { semaine: 'S37', target: 400,  livree: 400  },
  { semaine: 'S38', target: 600,  livree: 600  },
  { semaine: 'S39', target: 700,  livree: 700  },
  { semaine: 'S40', target: 780,  livree: 780  },
  { semaine: 'S41', target: 780,  livree: 780  },
  { semaine: 'S42', target: 780,  livree: 780  },
  { semaine: 'S43', target: 780,  livree: 780  },
  { semaine: 'S44', target: 780,  livree: 780  },
  { semaine: 'S45', target: 780,  livree: 780  },
  { semaine: 'S46', target: 780,  livree: 780  },
  { semaine: 'S47', target: 780,  livree: 780  },
  { semaine: 'S48', target: 780,  livree: 780  },
  { semaine: 'S49', target: 450,  livree: 450  },
  { semaine: 'S50', target: 450,  livree: 450  },
  { semaine: 'S51', target: 430,  livree: 430  },
];

export async function GET() {
  return NextResponse.json({ planning: PLANNING });
}
