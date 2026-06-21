import { db, rows, num, str } from "./shared";

export interface SellerRow {
  name: string;
  role: string;
  ganhos: number;
  valorReais: number;
  abertas: number;
  perdidas: number;
  winRate: number;
}

const ROLE_LABEL: Record<string, string> = {
  sdr: "SDR",
  gestor: "Gestor de Contas",
  outro: "Outro",
};

export async function getSellers(): Promise<SellerRow[]> {
  const sql = db();
  return rows(
    await sql`
      select u.name, u.role,
        count(*) filter (where d.is_proposta and d.status='WON')::int ganhos,
        coalesce(sum(d.value_cents) filter (where d.is_proposta and d.status='WON'),0) valor_cents,
        count(*) filter (where d.is_proposta and d.status='OPEN')::int abertas,
        count(*) filter (where d.is_proposta and d.status='LOST')::int perdidas
      from users u join deals d on d.owner_id = u.id
      group by u.name, u.role
      having count(d.id) > 0
      order by valor_cents desc`,
  ).map((r) => {
    const ganhos = num(r.ganhos);
    const perdidas = num(r.perdidas);
    const decididos = ganhos + perdidas;
    return {
      name: str(r.name),
      role: ROLE_LABEL[str(r.role)] ?? str(r.role),
      ganhos,
      valorReais: num(r.valor_cents) / 100,
      abertas: num(r.abertas),
      perdidas,
      winRate: decididos ? (ganhos / decididos) * 100 : 0,
    };
  });
}
