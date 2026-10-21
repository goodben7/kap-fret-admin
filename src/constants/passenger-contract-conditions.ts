/**
 * Extraits des conditions du contrat — billetterie / passagers.
 * Source : formulaire papier KAP FRET / validation ops.
 *
 * Paramètres numériques associés : `ticket-business-rules.ts`
 */
export const PASSENGER_CONTRACT_CONDITIONS_TITLE =
  'EXTRAITS DES CONDITIONS DU CONTRAT' as const

export const PASSENGER_CONTRACT_CONDITIONS = [
  'Peu importe la faute de l\'Autorité de l\'État ou de la compagnie, le client paie 5% d\'imprimer de valeur au cas où il est débarqué.',
  'Si le passager a fait le checking et n\'a pas pris le vol, il perd le billet sans préjudice.',
  'Ce billet est valable 1 mois à partir de la date d\'émission, sauf indication contraire sur le billet. Son prix est payé intégralement. Le transporteur peut refuser d\'effectuer le transport si le tarif applicable n\'a pas été payé.',
  'Le checking des bagages pour passagers se fait deux heures au moins avant l\'embarquement.',
  'Les heures et dates d\'embarquement mentionnées sur le billet ne sont qu\'indicatives. Elles peuvent être modifiées sans préavis en cas de nécessité.',
  'Le remboursement du prix de billet en cas d\'impossibilité pour le passager de voyager se fait moyennant une réduction de prix de 50%.',
  'L\'annulation de réservation se fait au moins 72 heures avant le voyage. Toute annulation de moins de 72 heures entraîne une pénalité de 100$. Celle intervenant dans les 24 heures de l\'embarquement rend le billet caduc (noshow).',
  'L\'Agence décline toute responsabilité en cas de vol ou perte des objets de valeur non-déclarés contenus dans les bagages. Il en est de même des objets interdits par la réglementation nationale.',
  'Tout litige survenu à l\'occasion de ce contrat est soumis à la convention de Varsovie.',
] as const

export type PassengerContractCondition = (typeof PASSENGER_CONTRACT_CONDITIONS)[number]
