"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Ticket,
  Star,
  Music,
  Headphones,
} from "lucide-react";

interface EventTicketProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventName: string;
  quantity?: number;
  ticketIdentifier?: string;
}

export default function EventTicket({
  firstName,
  lastName,
  email,
  phone,
  eventName,
  quantity = 1,
  ticketIdentifier,
}: EventTicketProps) {
  const [ticketId, setTicketId] = useState(ticketIdentifier || "");
  const [qrStyle, setQrStyle] = useState({
    bgColor: "#000000",
    fgColor: "#ffffff",
  });
  const [decorativeElement, setDecorativeElement] = useState(0);

  useEffect(() => {
    // Generate a random ticket ID if not provided
    if (!ticketIdentifier) {
      setTicketId(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // Generate random QR style based on user
    const styles = [
      {
        // Neon style
        bgColor: "#000000",
        fgColor: "#00ffcc",
      },
      {
        // Party style
        bgColor: "#1a1a2e",
        fgColor: "#ff2e63",
      },
      {
        // Minimal style
        bgColor: "#000000",
        fgColor: "#ffffff",
      },
      {
        // Funky style
        bgColor: "#240046",
        fgColor: "#ff9100",
      },
      {
        // Cool blue style
        bgColor: "#03045e",
        fgColor: "#caf0f8",
      },
    ];

    // Select a random style based on the user's name or ticket ID
    const nameHash = (firstName + lastName + ticketId)
      .split("")
      .reduce((a, b) => {
        return a + b.charCodeAt(0);
      }, 0);

    const selectedStyle = styles[nameHash % styles.length];
    setQrStyle(selectedStyle);

    // Set decorative element based on user
    setDecorativeElement(nameHash % 4); // 0-3 for different decorative elements
  }, [firstName, lastName, ticketId, ticketIdentifier]);

  const qrValue = JSON.stringify({
    ticketId,
    firstName,
    lastName,
    email,
    phone,
    eventName,
    quantity,
  });

  // Get admission text based on quantity
  const getAdmissionText = () => {
    if (quantity === 1) return "ADMIT ONE";
    if (quantity === 2) return "ADMIT TWO";
    if (quantity === 3) return "ADMIT THREE";
    return `ADMIT ${quantity}`;
  };

  // Get name text based on quantity
  const getNameText = () => {
    if (quantity === 1) return `${firstName} ${lastName}`;
    if (quantity === 2) return `${firstName} ${lastName} + Friend`;
    return `${firstName} ${lastName} + Friends`;
  };

  // Decorative elements for the customer info section
  const decorativeElements = [
    // Element 0: Headphones with stars
    <div key="headphones" className="flex items-center justify-center relative">
      <div className="bg-gray-800 p-2 rounded-md">
        <Headphones className="h-10 w-10 text-blue-400" />
      </div>
      <Star className="absolute -top-3 -right-3 h-5 w-5 text-yellow-400" />
      <Star className="absolute -bottom-3 -left-3 h-4 w-4 text-pink-400" />
    </div>,

    // Element 1: Music notes with stars
    <div
      key="music"
      className="flex flex-col items-center justify-center relative"
    >
      <Music
        className="h-8 w-8 text-pink-400 animate-bounce"
        style={{ animationDuration: "2s" }}
      />
      <Music
        className="h-6 w-6 text-cyan-400 mt-2 animate-bounce"
        style={{ animationDuration: "1.5s", animationDelay: "0.5s" }}
      />
      <Star className="absolute -top-4 -right-4 h-6 w-6 text-yellow-400" />
      <Star className="absolute -bottom-4 -left-4 h-5 w-5 text-green-400" />
    </div>,

    // Element 2: Enhanced star pattern
    <div key="stars" className="relative h-20 w-20">
      <Star className="absolute top-0 left-0 h-7 w-7 text-yellow-400" />
      <Star className="absolute top-2 right-2 h-8 w-8 text-pink-400" />
      <Star className="absolute bottom-2 left-4 h-6 w-6 text-blue-400" />
      <Star className="absolute bottom-0 right-0 h-9 w-9 text-green-400" />
      <Star className="absolute top-10 left-10 h-5 w-5 text-purple-400" />
    </div>,

    // Element 3: Vinyl record with stars
    <div
      key="vinyl"
      className="relative h-16 w-16 flex items-center justify-center"
    >
      <div className="h-16 w-16 rounded-full bg-gray-900 border-4 border-gray-800 flex items-center justify-center">
        <div className="h-5 w-5 rounded-full bg-gray-700"></div>
        <div className="absolute inset-0 border-2 border-gray-700 rounded-full m-2"></div>
      </div>
      <Star className="absolute -top-4 -right-4 h-6 w-6 text-yellow-400" />
      <Star className="absolute -bottom-4 -left-4 h-5 w-5 text-pink-400" />
    </div>,
  ];

  return (
    <div className="w-full max-w-sm">
      {/* Main ticket container - vertical layout for mobile */}
      <div className="bg-gradient-to-b from-black via-gray-950 to-black rounded-md overflow-hidden shadow-2xl border border-gray-900 relative">
        {/* Fun pattern overlay */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.1) 2px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        ></div>

        {/* Header bar */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 py-3 px-5 flex justify-between items-center relative">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white tracking-wider">
              DJAOULI ENT.
            </h1>
          </div>
          <div className="bg-yellow-500 px-2 py-1 rounded-sm transform rotate-2 shadow-lg">
            <p className="text-xs font-bold text-gray-900">#{ticketId}</p>
          </div>
        </div>

        {/* Event name */}
        <div className="px-5 pt-5 pb-3">
          <div className="bg-blue-700 py-2 px-3 inline-block rounded-sm transform -rotate-1 shadow-lg">
            <h2 className="text-xl font-bold text-white uppercase">
              {eventName}
            </h2>
          </div>
        </div>

        {/* QR code section */}
        <div className="px-5 py-4 flex justify-center">
          <div className="bg-white p-3 rounded-sm transform rotate-1 shadow-lg">
            <QRCodeSVG
              value={qrValue}
              size={180}
              bgColor={qrStyle.bgColor}
              fgColor={qrStyle.fgColor}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Admit section */}
        <div className="px-5 pb-4 flex justify-center">
          <div className="bg-blue-700 text-white px-6 py-2 rounded-sm text-center transform -rotate-1 shadow-lg">
            <p className="font-bold text-lg">{getAdmissionText()}</p>
            <p className="text-xs mt-1 opacity-90">{getNameText()}</p>
          </div>
        </div>

        {/* Event details */}
        <div className="px-5 py-4 bg-gray-950/80">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <div className="bg-amber-500 p-1.5 rounded-sm">
                <Calendar className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">DATE</p>
                <p className="text-white text-sm font-medium">May 25, 2025</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-rose-600 p-1.5 rounded-sm">
                <Clock className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">TIME</p>
                <p className="text-white text-sm font-medium">8:00 PM</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-600 p-1.5 rounded-sm">
                <MapPin className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">VENUE</p>
                <p className="text-white text-sm font-medium">Club Djaouli</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-1.5 rounded-sm">
                <Ticket className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">TICKET ID</p>
                <p className="text-white text-sm font-medium">{ticketId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer info */}
        <div className="px-5 py-4">
          <h3 className="text-gray-400 text-sm font-medium mb-3 border-b border-gray-900 pb-1 flex items-center">
            <Star className="h-3 w-3 mr-1 text-yellow-500" />
            TICKET HOLDER
            <Star className="h-3 w-3 ml-1 text-yellow-500" />
          </h3>
          <div className="flex">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="bg-cyan-600 p-1.5 rounded-sm">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-white text-sm">
                  {firstName} {lastName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-pink-600 p-1.5 rounded-sm">
                  <Phone className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-white text-sm">{phone}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-green-600 p-1.5 rounded-sm">
                  <Mail className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-white text-sm truncate">{email}</p>
              </div>
            </div>
            <div className="ml-2 flex items-center justify-center w-20">
              {decorativeElements[decorativeElement]}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2 bg-black border-t border-gray-900">
          <p className="text-[10px] text-center text-gray-600 font-medium">
            MADE IN BABI • OFFICIAL TICKET
          </p>
        </div>
      </div>
    </div>
  );
}
