type Props = { params: { id: string } };

export default function HistoryDetailPage({ params }: Props) {
  return <div>履歴詳細画面（仮）: {params.id}</div>;
}
