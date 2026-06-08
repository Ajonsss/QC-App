import FileUploader from '../components/FileUploader';

export default function Home() {
  return (
    <main className="min-h-screen bg-black-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-800">QC Dashboard</h1>
          <p className="text-gray-500 mt-2">Local Image Extraction & Grammar Checking</p>
        </header>

        <FileUploader />
      </div>
    </main>
  );
}