import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-brand-yellow/10">
      {/* Hero Section */}
      <section className="container px-4 pt-20 pb-32 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-display text-brand-blue mb-6">
            Where IRL meets web3
          </h1>
          <p className="text-2xl font-body text-navy mb-12">
            One-click participatory budgeting for real-world events. 
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://tally.so/r/waaAoy"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-brand-blue text-white rounded-xl font-eyebrow text-lg hover:bg-brand-blue/90 transition-colors"
            >
              Get Started
            </a>
            <Link 
              href="#features"
              className="px-8 py-4 bg-white text-brand-blue border-2 border-brand-blue rounded-xl font-eyebrow text-lg hover:bg-brand-blue/5 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="container px-4 mx-auto">
          <h2 className="text-4xl font-display text-brand-blue text-center mb-16">
            Everything you need for IRL funding
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Easy Email Onboarding",
                description: "Invite users to use email or phone number, or wallet if they have one."
              },
              {
                title: "Transparently Composable",
                description: "Secure and transparent verification under the hood, powered by Ethereum Attestations."
              },
              {
                title: "Realtime Dashboard",
                description: "Live projection-ready dashboard perfect for events and gatherings."
              },
              {
                title: "Physical Integration Kit",
                description: "NFC cards, stickers, and QR codes for physical interactions."
              },
              {
                title: "Choose Your Funding Strategy",
                description: "Modern funding mechanisms available now, with more coming soon."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-gray-100 hover:bg-brand-yellow/20 transition-colors">
                <h3 className="text-xl font-eyebrow text-brand-blue mb-4">{feature.title}</h3>
                <p className="text-navy font-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-brand-blue text-white">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-4xl font-display mb-6">Interested in using this for your event?</h2>
          <p className="text-xl font-body mb-12 text-sky-blue">
            Join us in making participatory budgeting more fun and accessible.
          </p>
          <a 
            href="https://tally.so/r/waaAoy"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-white text-brand-blue rounded-xl font-eyebrow text-lg hover:bg-opacity-90 transition-colors inline-block"
          >
            Get Started Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-gray-100">
        <div className="container px-4 mx-auto text-center text-sm text-gray-600">
          Built by{' '}
          <a href="https://wovenweb.org" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
            Woven Web
          </a>{" "}
          & amazing contributors
        </div>
      </footer>
    </main>
  )
} 