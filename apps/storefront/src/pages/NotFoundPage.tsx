import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="min-h-[100svh] flex flex-col items-center justify-center text-center px-4 sm:px-6 bg-background">
      <span className="font-serif text-[7rem] sm:text-[10rem] leading-none text-line select-none">404</span>
      <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] mt-4">
        This page has left the collection.
      </h1>
      <p className="text-[#6B6560] mt-4 max-w-md leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-block mt-8 bg-[#1A1A1A] text-white px-8 py-4 text-sm uppercase tracking-widest font-medium hover:bg-[#C44A2D] transition-colors"
      >
        Return Home
      </Link>
    </main>
  );
}
