import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  ArrowRight,
  Plus,
  Users,
  ShieldCheck,
  Heart,
  Edit3,
  ChevronRight,
  Mail,
  Heart as HeartSolid,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Fix Leaflet default marker icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

interface HeroLocationItem {
  id: string;
  title: string;
  location: string;
  category: string;
  yearTag: string;
  image: string;
  lat: number;
  lng: number;
  slug: string;
  contributorsCount: number;
  likes: number;
  comments: number;
}

const HERO_LOCATIONS: HeroLocationItem[] = [
  {
    id: 'cms-grammar-school',
    title: 'The Old CMS Grammar School',
    location: 'Abeokuta, Ogun State',
    category: 'School',
    yearTag: 'Circa 1972',
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=400&q=80',
    lat: 7.1475,
    lng: 3.3619,
    slug: 'the-old-cms-grammar-school',
    contributorsCount: 24,
    likes: 56,
    comments: 12,
  },
  {
    id: 'st-gregorys-college',
    title: "St. Gregory's College Days",
    location: 'Ikoyi, Lagos State',
    category: 'School',
    yearTag: 'Circa 1985',
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=400&q=80',
    lat: 6.45,
    lng: 3.4167,
    slug: 'st-gregorys-college-days',
    contributorsCount: 18,
    likes: 42,
    comments: 6,
  },
  {
    id: 'balogun-market',
    title: 'Balogun Market Hustle',
    location: 'Lagos Island, Lagos State',
    category: 'Market',
    yearTag: 'Circa 1990',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=400&q=80',
    lat: 6.455,
    lng: 3.3841,
    slug: 'balogun-market-hustle',
    contributorsCount: 32,
    likes: 38,
    comments: 4,
  },
  {
    id: 'national-stadium',
    title: 'The 1994 Super Eagles Match',
    location: 'National Stadium, Lagos',
    category: 'Event',
    yearTag: '1994',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    lat: 6.4969,
    lng: 3.3644,
    slug: 'the-1994-super-eagles-match',
    contributorsCount: 45,
    likes: 61,
    comments: 8,
  },
  {
    id: 'yaba-street',
    title: 'Our Street in the 70s',
    location: 'Yaba, Lagos State',
    category: 'Community',
    yearTag: 'Circa 1975',
    image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=400&q=80',
    lat: 6.5095,
    lng: 3.3785,
    slug: 'our-street-in-the-70s',
    contributorsCount: 31,
    likes: 27,
    comments: 3,
  },
];

// Helper to create custom green leaf pin icons for hero map
const createHeroPinIcon = (isSelected: boolean, count?: number) => {
  if (count) {
    return L.divIcon({
      className: 'hero-cluster-marker',
      html: `
        <div style="
          background-color: #0B6B3A;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
        ">
          ${count}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  return L.divIcon({
    className: 'hero-location-marker',
    html: `
      <div style="
        background-color: ${isSelected ? '#053F22' : '#0B6B3A'};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 11px;">📍</div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

interface HomePageProps {
  onOpenAuthModal: (tab?: 'login' | 'register') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenAuthModal: _onOpenAuthModal }) => {
  const [activeLocation, setActiveLocation] = useState<HeroLocationItem>(HERO_LOCATIONS[0]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-body overflow-x-hidden">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F4FAF6] to-white py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#E8F5EE] border border-[#A3D9BC]/50 text-[#0B6B3A] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#0B6B3A] animate-pulse"></span>
                <span>A MAP OF MEMORIES. A NATION'S STORY.</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-black tracking-tight leading-[1.15]">
                Where Nigeria <br />
                <span className="text-[#0B6B3A]">remembers.</span>
              </h1>

              {/* Body Text */}
              <p className="text-sm sm:text-base text-charcoal-dark leading-relaxed max-w-xl mx-auto lg:mx-0">
                NaijaPins is a community-powered platform where people like you share real stories, photos, and memories tied to places across Nigeria.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link to="/explore" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                    className="w-full sm:w-auto bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold rounded-lg px-6 py-3 shadow-md justify-center"
                  >
                    Explore Memories
                  </Button>
                </Link>
                <Link to="/add-memory" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    leftIcon={<Plus className="w-5 h-5 text-[#0B6B3A]" />}
                    className="w-full sm:w-auto border-[#0B6B3A] text-[#0B6B3A] hover:bg-[#E8F5EE] font-bold rounded-lg px-6 py-3 justify-center"
                  >
                    Add Your Memory
                  </Button>
                </Link>
              </div>

              {/* Popular Searches Tags */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs text-charcoal-muted">
                <span className="font-semibold text-black shrink-0">Popular searches:</span>
                {['Lagos', 'Abeokuta', 'Old Schools', 'Markets', '1960s', 'Port Harcourt'].map((tag) => (
                  <Link
                    key={tag}
                    to={`/explore?query=${encodeURIComponent(tag)}`}
                    className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-[#E8F5EE] hover:text-[#0B6B3A] text-charcoal-dark font-medium transition-colors border border-gray-200"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Map Canvas Visual & Floating Card */}
            <div className="lg:col-span-6 relative">
              <div className="relative w-full h-[320px] sm:h-[420px] rounded-2xl overflow-hidden border border-gray-200 bg-[#E3EFE9] shadow-xl z-0">
                
                {/* Interactive Leaflet Hero Map */}
                <MapContainer
                  center={[6.7, 3.4]} // Southern Nigeria (Lagos / Ogun)
                  zoom={9}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  className="w-full h-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Render Cluster Badges */}
                  <Marker position={[7.1475, 3.3619]} icon={createHeroPinIcon(false, 32)} eventHandlers={{ click: () => setActiveLocation(HERO_LOCATIONS[0]) }} />
                  <Marker position={[6.45, 3.4167]} icon={createHeroPinIcon(false, 18)} eventHandlers={{ click: () => setActiveLocation(HERO_LOCATIONS[1]) }} />
                  <Marker position={[6.455, 3.3841]} icon={createHeroPinIcon(false, 23)} eventHandlers={{ click: () => setActiveLocation(HERO_LOCATIONS[2]) }} />
                  <Marker position={[6.4969, 3.3644]} icon={createHeroPinIcon(false, 45)} eventHandlers={{ click: () => setActiveLocation(HERO_LOCATIONS[3]) }} />
                  <Marker position={[6.5095, 3.3785]} icon={createHeroPinIcon(false, 31)} eventHandlers={{ click: () => setActiveLocation(HERO_LOCATIONS[4]) }} />
                </MapContainer>

                {/* Floating Preview Card (Fully Responsive on Mobile & Desktop) */}
                <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:right-4 sm:left-auto bg-white/95 backdrop-blur-sm p-3 sm:p-4 rounded-xl shadow-2xl border border-gray-100 flex items-center gap-3 sm:max-w-sm z-20 animate-fade-in">
                  <img
                    src={activeLocation.image}
                    alt={activeLocation.title}
                    className="w-16 h-16 sm:w-22 sm:h-22 rounded-lg object-cover shrink-0 border border-gray-200"
                  />
                  <div className="space-y-1 overflow-hidden">
                    <h4 className="font-heading font-bold text-xs sm:text-base text-black leading-tight truncate">
                      {activeLocation.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-charcoal-muted font-medium truncate">{activeLocation.location}</p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#0B6B3A] text-[9px] sm:text-[10px] font-bold">
                        {activeLocation.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-charcoal-dark text-[9px] sm:text-[10px] font-medium">
                        {activeLocation.yearTag}
                      </span>
                    </div>
                    {/* Avatars Stack */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center">
                        <div className="flex -space-x-1.5">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-600 border border-white text-[8px] sm:text-[9px] font-bold text-white flex items-center justify-center">TA</div>
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-600 border border-white text-[8px] sm:text-[9px] font-bold text-white flex items-center justify-center">KO</div>
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 border border-white text-[8px] sm:text-[9px] font-bold text-white flex items-center justify-center">DM</div>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-charcoal-muted ml-1 font-medium">+{activeLocation.contributorsCount}</span>
                      </div>
                      <Link
                        to={`/explore?location=${encodeURIComponent(activeLocation.location)}`}
                        className="text-[10px] font-bold text-[#0B6B3A] hover:underline"
                      >
                        View Pin →
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* GREEN FEATURE HIGHLIGHTS BAR */}
      <section className="bg-[#0B6B3A] text-white py-6 border-y border-[#064D2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
            
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#064D2A] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Community Powered</h4>
                <p className="text-xs text-emerald-100">Real stories from real people</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#064D2A] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Place Based</h4>
                <p className="text-xs text-emerald-100">Memories tied to real places</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#064D2A] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Preserve History</h4>
                <p className="text-xs text-emerald-100">Protecting our shared heritage</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#064D2A] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Nigeria First</h4>
                <p className="text-xs text-emerald-100">Our stories, our way</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-12 sm:py-20 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0B6B3A]">
            HOW IT WORKS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-black mt-2 mb-3">
            Share. Discover. Remember.
          </h2>
          <p className="text-charcoal-dark text-sm sm:text-base max-w-xl mx-auto mb-10 sm:mb-16 leading-relaxed">
            Three simple steps to keep Nigeria's memories alive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E8F5EE] flex items-center justify-center text-[#0B6B3A] border-2 border-[#A3D9BC]">
                  <MapPin className="w-7 h-7 sm:w-9 sm:h-9 stroke-[2]" />
                </div>
                <span className="absolute -top-1 -left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0B6B3A] text-white text-xs font-bold flex items-center justify-center shadow-md">
                  1
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-black">Find a Place</h3>
              <p className="text-xs sm:text-sm text-charcoal-dark leading-relaxed max-w-xs">
                Search or explore the map to find a location that means something to you.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E8F5EE] flex items-center justify-center text-[#0B6B3A] border-2 border-[#A3D9BC]">
                  <Edit3 className="w-7 h-7 sm:w-9 sm:h-9 stroke-[2]" />
                </div>
                <span className="absolute -top-1 -left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0B6B3A] text-white text-xs font-bold flex items-center justify-center shadow-md">
                  2
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-black">Share Your Memory</h3>
              <p className="text-xs sm:text-sm text-charcoal-dark leading-relaxed max-w-xs">
                Add your story, photos, audio, and the year it happened.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E8F5EE] flex items-center justify-center text-[#0B6B3A] border-2 border-[#A3D9BC]">
                  <Users className="w-7 h-7 sm:w-9 sm:h-9 stroke-[2]" />
                </div>
                <span className="absolute -top-1 -left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0B6B3A] text-white text-xs font-bold flex items-center justify-center shadow-md">
                  3
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-black">Inspire Others</h3>
              <p className="text-xs sm:text-sm text-charcoal-dark leading-relaxed max-w-xs">
                Your memory becomes part of Nigeria's growing digital archive for generations to come.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* RECENT MEMORIES SECTION */}
      <section className="py-12 sm:py-20 bg-[#F8FAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0B6B3A]">
                RECENT MEMORIES
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-black mt-1">
                Stories from across Nigeria
              </h2>
            </div>

            <Link
              to="/explore"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#0B6B3A] hover:underline"
            >
              <span>View all memories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Cards Grid using exact locations from image */}
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {HERO_LOCATIONS.slice(1, 5).map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => setActiveLocation(loc)}
                  className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-gray-100">
                    <img
                      src={loc.image}
                      alt={loc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-[#0B6B3A] text-white text-xs font-semibold">
                      {loc.category}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-black group-hover:text-[#0B6B3A] transition-colors">
                        {loc.title}
                      </h3>
                      <p className="text-xs text-charcoal-muted font-normal">{loc.location}</p>
                      <p className="text-xs text-charcoal-dark font-medium pt-0.5">{loc.yearTag}</p>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-charcoal-muted">
                      <span className="font-normal text-black">
                        by {loc.id === 'st-gregorys-college' ? 'Tunde A.' : loc.id === 'balogun-market' ? 'Kemi O.' : loc.id === 'national-stadium' ? 'Dele M.' : 'Aisha B.'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <HeartSolid className="w-3.5 h-3.5 text-red-500 fill-red-500" /> {loc.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-charcoal-muted" /> {loc.comments}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            </div>

            {/* Floating Carousel Navigation Arrow */}
            <button
              aria-label="Next memories"
              className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg items-center justify-center text-charcoal-dark hover:bg-[#0B6B3A] hover:text-white transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </section>

      {/* NEWSLETTER SUBSCRIPTION BANNER */}
      <section className="bg-[#0B6B3A] text-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-4 text-center lg:text-left">
              <div className="w-12 h-12 rounded-full bg-[#064D2A] flex items-center justify-center shrink-0 hidden sm:flex">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-heading font-bold text-white">
                  Stay connected to our stories
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100">
                  Get updates on new memories and inspiring stories from across Nigeria.
                </p>
              </div>
            </div>

            {/* Subscription Form */}
            <form onSubmit={(e) => e.preventDefault()} className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full sm:w-72 h-11 px-4 rounded-lg bg-[#064D2A] border border-emerald-700/60 text-white placeholder-emerald-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-white"
                required
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto bg-[#053F22] hover:bg-[#032B17] text-white font-bold h-11 px-6 rounded-lg shadow-sm justify-center"
              >
                Subscribe
              </Button>
            </form>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#09150E] text-gray-400 py-12 sm:py-16 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            
            {/* Logo & Tagline Column */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0B6B3A] flex items-center justify-center text-white">
                  <MapPin className="w-4 h-4 fill-white stroke-[#0B6B3A]" />
                </div>
                <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                  NaijaPins
                </span>
              </div>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                Where Nigeria remembers. A community heritage digital archive preserving stories across Nigeria.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-4 text-gray-400 pt-2">
                <span className="hover:text-white cursor-pointer">🌐</span>
                <span className="hover:text-white cursor-pointer">🐦</span>
                <span className="hover:text-white cursor-pointer">📸</span>
                <span className="hover:text-white cursor-pointer">▶️</span>
              </div>
            </div>

            {/* Links Column 1: Explore */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">Explore</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/explore" className="hover:text-white">Map</Link></li>
                <li><Link to="/explore?view=timeline" className="hover:text-white">Timeline</Link></li>
                <li><Link to="/explore?view=categories" className="hover:text-white">Categories</Link></li>
                <li><Link to="/explore" className="hover:text-white">All Memories</Link></li>
              </ul>
            </div>

            {/* Links Column 2: Contribute */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">Contribute</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/add-memory" className="hover:text-white">Add Memory</Link></li>
                <li><a href="#how-it-works" className="hover:text-white">How it Works</a></li>
                <li><a href="#guidelines" className="hover:text-white">Community Guidelines</a></li>
              </ul>
            </div>

            {/* Links Column 3: About & Legal */}
            <div className="space-y-3 col-span-2 sm:col-span-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">About</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#about" className="hover:text-white">About Us</a></li>
                <li><a href="#mission" className="hover:text-white">Our Mission</a></li>
                <li><a href="#contact" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3 text-center sm:text-left">
            <p>&copy; 2024 NaijaPins. All rights reserved.</p>
            <p>Made with <span className="text-red-500">❤️</span> for Nigeria.</p>
          </div>

        </div>
      </footer>
    </div>
  );
};
