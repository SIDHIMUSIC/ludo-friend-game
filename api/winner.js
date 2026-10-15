export default function handler(req, res) {
  const winner = process.env.WINNER_COLOR || process.env.NEXT_PUBLIC_WINNER_COLOR || null;
  res.status(200).json({ winner: winner ? winner.toLowerCase() : null });
}
