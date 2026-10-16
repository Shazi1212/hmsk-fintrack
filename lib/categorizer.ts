// Auto-categorization engine supporting English, Portuguese, and German
// Matches merchant names / descriptions to expense categories

export interface CategoryRule {
  name: string
  color: string
  icon: string
  keywords: string[]
}

export const DEFAULT_CATEGORIES: CategoryRule[] = [
  {
    name: 'Food & Dining',
    color: '#f59e0b',
    icon: '🍽️',
    keywords: [
      // EN
      'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'sushi', 'bakery',
      'mcdonalds', 'starbucks', 'subway', 'kfc', 'food', 'dining', 'lunch',
      'dinner', 'breakfast', 'bistro', 'grill', 'bar ', 'pub', 'diner',
      'kitchen', 'eatery', 'takeaway', 'delivery food',
      // DE
      'essen', 'restaurant', 'bäckerei', 'metzgerei', 'gaststätte',
      'imbiss', 'döner', 'currywurst', 'kneipe', 'biergarten',
      // PT
      'restaurante', 'lanchonete', 'padaria', 'refeição', 'almoço',
      'jantar', 'café', 'bar ', 'pizzaria', 'churrascaria', 'mercadão',
    ],
  },
  {
    name: 'Groceries',
    color: '#84cc16',
    icon: '🛒',
    keywords: [
      // EN
      'grocery', 'supermarket', 'market', 'whole foods', 'walmart', 'lidl',
      'aldi', 'tesco', 'sainsbury', 'costco', 'trader joe', 'kroger',
      'safeway', 'fresh market', 'organic',
      // DE
      'lebensmittel', 'supermarkt', 'rewe', 'edeka', 'penny', 'netto',
      'kaufland', 'norma', 'tegut', 'marktkauf', 'real ',
      // PT
      'supermercado', 'mercado', 'hortifruti', 'pão de açúcar',
      'carrefour', 'extra ', 'atacadão', 'zaffari', 'continente',
    ],
  },
  {
    name: 'Transport',
    color: '#3b82f6',
    icon: '🚗',
    keywords: [
      // EN
      'uber', 'lyft', 'taxi', 'transport', 'metro', 'subway', 'bus',
      'train', 'parking', 'fuel', 'gas station', 'petrol', 'shell',
      'bp ', 'chevron', 'exxon', 'toll', 'highway', 'rental car',
      'enterprise', 'hertz', 'avis', 'zip car',
      // DE
      'tanken', 'tankstelle', 'bahn', 'deutsche bahn', 'mvv', 'hvv',
      'bvg', 'parken', 'autobahn', 'mietwagen',
      // PT
      'combustível', 'posto', 'transporte', 'ônibus', 'metrô',
      'trem', 'estacionamento', 'táxi', 'uber',
    ],
  },
  {
    name: 'Shopping',
    color: '#ec4899',
    icon: '🛍️',
    keywords: [
      // EN
      'amazon', 'ebay', 'etsy', 'shop', 'store', 'mall', 'fashion',
      'clothing', 'shoes', 'zara', 'h&m', 'uniqlo', 'mango', 'gap',
      'nike', 'adidas', 'ikea', 'target', 'best buy', 'apple store',
      // DE
      'kaufen', 'einkauf', 'kleidung', 'schuhe', 'kaufhof', 'saturn',
      'mediamarkt', 'dm ', 'rossmann', 'müller', 'douglas',
      // PT
      'loja', 'compra', 'roupa', 'sapato', 'americanas', 'submarino',
      'magazine luiza', 'shoptime', 'lojas',
    ],
  },
  {
    name: 'Health & Medical',
    color: '#ef4444',
    icon: '🏥',
    keywords: [
      // EN
      'pharmacy', 'hospital', 'doctor', 'medical', 'health', 'clinic',
      'dentist', 'optician', 'gym', 'fitness', 'wellness', 'cvs',
      'walgreens', 'boots', 'chemist', 'insurance health',
      // DE
      'apotheke', 'arzt', 'zahnarzt', 'krankenhaus', 'fitnessstudio',
      'sport', 'gesundheit', 'krankenkasse',
      // PT
      'farmácia', 'médico', 'hospital', 'dentista', 'academia',
      'plano de saúde', 'clínica', 'drogaria',
    ],
  },
  {
    name: 'Entertainment',
    color: '#8b5cf6',
    icon: '🎬',
    keywords: [
      // EN
      'netflix', 'spotify', 'amazon prime', 'disney+', 'hulu', 'cinema',
      'movie', 'concert', 'theater', 'museum', 'game', 'steam',
      'playstation', 'xbox', 'nintendo', 'ticketmaster', 'eventbrite',
      // DE
      'kino', 'musik', 'konzert', 'theater', 'unterhaltung',
      'gaming', 'spielothek',
      // PT
      'cinema', 'entretenimento', 'show', 'streaming', 'jogos',
    ],
  },
  {
    name: 'Utilities',
    color: '#06b6d4',
    icon: '⚡',
    keywords: [
      // EN
      'electric', 'electricity', 'water bill', 'gas bill', 'internet',
      'phone bill', 'utility', 'cable', 'broadband', 'telecom',
      'at&t', 'verizon', 'comcast', 'sprint', 't-mobile',
      // DE
      'strom', 'wasser', 'telefon', 'handy', 'telekom', 'vodafone',
      'o2 ', 'gas rechnung', 'stadtwerke',
      // PT
      'energia', 'luz', 'água', 'telefone', 'internet', 'claro',
      'tim ', 'vivo', 'oi ', 'net ',
    ],
  },
  {
    name: 'Housing & Rent',
    color: '#f97316',
    icon: '🏠',
    keywords: [
      // EN
      'rent', 'mortgage', 'landlord', 'property', 'real estate',
      'housing', 'apartment', 'condo', 'maintenance',
      // DE
      'miete', 'wohnung', 'vermieter', 'nebenkosten', 'hausverwaltung',
      // PT
      'aluguel', 'aluguer', 'condomínio', 'iptu', 'imóvel',
    ],
  },
  {
    name: 'Travel',
    color: '#0ea5e9',
    icon: '✈️',
    keywords: [
      // EN
      'hotel', 'flight', 'airline', 'booking.com', 'airbnb', 'travel',
      'holiday', 'vacation', 'expedia', 'kayak', 'airfare', 'lufthansa',
      'ryanair', 'easyjet', 'british airways', 'delta', 'united air',
      // DE
      'flug', 'reise', 'urlaub', 'hotel', 'mietwagen',
      // PT
      'passagem', 'hotel', 'viagem', 'férias', 'pousada', 'hostel',
    ],
  },
  {
    name: 'Education',
    color: '#6366f1',
    icon: '📚',
    keywords: [
      // EN
      'tuition', 'university', 'college', 'school', 'course', 'udemy',
      'coursera', 'book', 'textbook', 'library', 'education', 'training',
      // DE
      'schule', 'universität', 'weiterbildung', 'kurs', 'lernmaterial',
      // PT
      'escola', 'faculdade', 'curso', 'livro', 'educação', 'mensalidade',
    ],
  },
  {
    name: 'Subscriptions',
    color: '#a855f7',
    icon: '🔄',
    keywords: [
      'subscription', 'monthly plan', 'annual plan', 'membership',
      'premium', 'pro plan', 'plus plan', 'adobe', 'microsoft 365',
      'dropbox', 'icloud', 'google one', 'notion', 'slack', 'zoom',
      'abonnement', 'assinatura',
    ],
  },
  {
    name: 'Income',
    color: '#10b981',
    icon: '💰',
    keywords: [
      // EN
      'salary', 'wage', 'payroll', 'paycheck', 'income', 'dividend',
      'interest earned', 'refund', 'cashback', 'bonus', 'freelance',
      // DE
      'gehalt', 'lohn', 'zinsen', 'rückerstattung', 'erstattung',
      // PT
      'salário', 'vencimento', 'rendimento', 'reembolso', 'restituição',
    ],
  },
  {
    name: 'Transfer',
    color: '#64748b',
    icon: '↔️',
    keywords: [
      'transfer', 'wire transfer', 'ach', 'zelle', 'venmo', 'paypal',
      'überweisung', 'sepa', 'transferência', 'pix',
    ],
  },
  {
    name: 'Other',
    color: '#94a3b8',
    icon: '📦',
    keywords: [],
  },
]

export function autoDetectCategory(description: string): string {
  const lower = description.toLowerCase()

  for (const cat of DEFAULT_CATEGORIES) {
    if (cat.name === 'Other') continue
    for (const keyword of cat.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return cat.name
      }
    }
  }

  return 'Other'
}

export function detectTransactionType(
  description: string,
  amount: number
): 'INCOME' | 'EXPENSE' | 'TRANSFER' {
  const lower = description.toLowerCase()

  const transferKeywords = [
    'transfer', 'überweisung', 'sepa', 'transferência', 'pix',
    'zelle', 'venmo', 'paypal', 'wire',
  ]
  if (transferKeywords.some(k => lower.includes(k))) return 'TRANSFER'

  const incomeKeywords = [
    'salary', 'payroll', 'deposit', 'income', 'credit', 'refund',
    'cashback', 'bonus', 'dividend', 'gehalt', 'lohn', 'zinsen',
    'salário', 'rendimento', 'crédito',
  ]
  if (amount > 0 || incomeKeywords.some(k => lower.includes(k))) return 'INCOME'

  return 'EXPENSE'
}
