import FileUploader from '../components/FileUploader';

export default function Home() {
  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: "url('/bg.png')",
      }}
    >
      <div className="max-w-6xl mx-auto p-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white-800">
            QC Dashboard
          </h1>
          <p className="text-white-500 mt-2">
            Local Image Extraction & Grammar Checking
          </p>
        </header>

        <FileUploader />
      </div>
    </main>
  );
}