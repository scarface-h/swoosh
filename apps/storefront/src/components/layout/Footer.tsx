import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-dark text-light">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16 lg:px-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:gap-16">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="font-serif text-3xl tracking-wide">SWOOSH</Link>
            <p className="mt-3 text-sm text-light/60 leading-relaxed max-w-xs">
              Contemporary fashion essentials for Bangladesh. Premium clothing designed with intention.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] font-medium mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm text-light/60">
              <li><Link to="/shop?category=men" className="hover:text-light transition-colors">Men</Link></li>
              <li><Link to="/shop?category=women" className="hover:text-light transition-colors">Women</Link></li>
              <li><Link to="/shop?filter=new" className="hover:text-light transition-colors">New Arrivals</Link></li>
              <li><Link to="/shop" className="hover:text-light transition-colors">All Products</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] font-medium mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-light/60">
              <li><Link to="/about" className="hover:text-light transition-colors">About</Link></li>
              <li><Link to="/contact" className="hover:text-light transition-colors">Contact</Link></li>
              <li><Link to="/faq" className="hover:text-light transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] font-medium mb-4">Help</h4>
            <ul className="space-y-2.5 text-sm text-light/60">
              <li><Link to="/shipping" className="hover:text-light transition-colors">Shipping</Link></li>
              <li><Link to="/returns" className="hover:text-light transition-colors">Returns</Link></li>
              <li><Link to="/privacy" className="hover:text-light transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-light transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-light/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 text-xs text-light/50">
          <p>&copy; {new Date().getFullYear()} SWOOSH. All rights reserved.</p>
          <p>Dhaka, Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
