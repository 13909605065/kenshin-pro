export default function ExercisesLoading() {
  return (
    <div className="min-h-screen bg-[#121212] p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[#1e1e1e] rounded-xl p-6 animate-pulse space-y-3"
          >
            <div className="h-5 bg-[#2a2a2a] rounded w-1/3" />
            <div className="h-4 bg-[#2a2a2a] rounded w-2/3" />
            <div className="h-4 bg-[#2a2a2a] rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
