export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 py-8 mt-16">
      <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} 个人博客. All rights reserved.</p>
        <p className="mt-2">
          Built with <span className="text-blue-500">Next.js</span> +{' '}
          <span className="text-green-500">Express</span> +{' '}
          <span className="text-purple-500">MongoDB</span>
        </p>
      </div>
    </footer>
  );
}
