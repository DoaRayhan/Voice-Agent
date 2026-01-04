import React from 'react';

function App() {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white min-h-screen font-sans">
      <header className="py-6 px-4 md:px-8 lg:px-12">
        <div className="container mx-auto flex items-center justify-between">
          <a href="/" className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">
            Startup
          </a>
          <nav className="space-x-6">
            <a href="#features" className="hover:text-gray-300 transition-colors">Features</a>
            <a href="#contact" className="hover:text-gray-300 transition-colors">Contact</a>
            <button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-4 py-2 rounded-md hover:shadow-lg transition-shadow">
              Get Started
            </button>
          </nav>
        </div>
      </header>

      <section className="py-24 px-4 md:px-8 lg:px-12">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">
            Innovate. Disrupt. Grow.
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-12">
            Revolutionizing the future with cutting-edge technology and innovative solutions.
          </p>
          <button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            Learn More
          </button>
        </div>
      </section>

      <section id="features" className="py-16 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <h3 className="text-2xl font-semibold mb-4">Feature 1</h3>
              <p className="text-gray-300">Description of feature 1. Explain its benefits and how it helps users.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <h3 className="text-2xl font-semibold mb-4">Feature 2</h3>
              <p className="text-gray-300">Description of feature 2. Explain its benefits and how it helps users.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <h3 className="text-2xl font-semibold mb-4">Feature 3</h3>
              <p className="text-gray-300">Description of feature 3. Explain its benefits and how it helps users.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-16 px-4 md:px-8 lg:px-12">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-8">Contact Us</h2>
          <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
            <form>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-300 text-sm font-bold mb-2">Name</label>
                <input type="text" id="name" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-slate-800 text-white" placeholder="Your Name" />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-300 text-sm font-bold mb-2">Email</label>
                <input type="email" id="email" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-slate-800 text-white" placeholder="Your Email" />
              </div>
              <div className="mb-6">
                <label htmlFor="message" className="block text-gray-300 text-sm font-bold mb-2">Message</label>
                <textarea id="message" rows={5} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-slate-800 text-white" placeholder="Your Message"></textarea>
              </div>
              <div className="flex items-center justify-between">
                <button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold px-4 py-2 rounded-md hover:shadow-lg transition-shadow focus:outline-none focus:shadow-outline" type="button">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer className="py-6 px-4 md:px-8 lg:px-12 text-center text-gray-400">
        <p>&copy; {new Date().getFullYear()} Startup. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;