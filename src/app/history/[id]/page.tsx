type Props = { params: Promise<{ id: string }> };

export default async function HistoryDetailPage({ params }: Props) {
  const { id } = await params;
  return <div>履歴詳細画面（仮）: {id}</div>;
}
