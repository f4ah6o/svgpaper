interface StatusBarProps {
  status: string
}

export function StatusBar({ status }: StatusBarProps) {
  return (
    <div className="status-bar">
      {status}
    </div>
  )
}
