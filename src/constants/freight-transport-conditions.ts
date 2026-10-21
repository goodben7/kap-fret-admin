/**
 * Conditions générales de transport de fret — texte officiel LTA (pied de page).
 * Source : formulaire papier KAP FRET / validation ops.
 *
 * Paramètres numériques associés : `freight-business-rules.ts`
 */
export const FREIGHT_TRANSPORT_CONDITIONS_TITLE =
  'CONDITIONS GENERALES DE TRANSPORT DE FRET' as const

export const FREIGHT_TRANSPORT_CONDITIONS = [
  "Le prix du transport est celui inscrit sur LTA payable dans les 48 heures de la date d'arrivée du Fret.",
  'Toute somme non payée dans les délais connaîtra de plein droit une actualisation immédiate.',
  'Le client est tenu d\'enlever son fret au dépôt de destination dans les 48 heures pour le fret-port dû et dans les 2 heures pour le fret payé cash à Kinshasa.',
  'Ce délai compte à partir de la date d\'arrivée du fret à Destination.',
  'Les frais d\'entreposage seront comptés après 2 jours à charge du client à l\'occurrence 10% par jour supplémentaire d\'entreposage du prix du transport du fret.',
  'En cas de non livraison de fret après 15 jours, le transporteur se réserve le droit d\'entamer une procédure de vendre la marchandise.',
  'Toute réclamation se fait obligatoirement et immédiatement au dépôt de destination dès réception.',
  'Les frais de transport de tous produits périssables (oignon, œufs, vivres-frais, et légumes surgelés) sont payables cash avant expédition.',
  'KAP FRET transporte le fret du client sous réserve du contenu en cas de vol ou de perte des marchandises.',
  'KAP FRET remboursera la valeur de 1,5 $ par kilo perdu ou volé.',
  'KAP FRET décline toute responsabilité en cas de la mort de bêtes lors de l\'exercice de ses fonctions.',
  'Le client récupère les bêtes mortes et paie l\'intégralité du coût du transport.',
  'La LTA non signée par la Caissière et l\'émetteur est nulle et sans valeur.',
  'Toute expédition sans document ou LTA est non réclamable.',
] as const

export type FreightTransportCondition = (typeof FREIGHT_TRANSPORT_CONDITIONS)[number]
