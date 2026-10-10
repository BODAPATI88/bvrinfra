// One place for every way to reach Ravi. Used by the home page, the Contact page
// and the phone contact bar, so a changed number is changed once.

export const email = "hello@bvrinfra.in";
export const phoneDisplay = "+91 95992 29585";
export const phoneTel = "+919599229585";
export const linkedin = "https://www.linkedin.com/in/ravikishore-b-917b85226/";
export const github = "https://github.com/BODAPATI88";

const whatsappNumber = "919599229585";

/** WhatsApp chat link, optionally with a message already typed in. */
export const whatsapp = (text?: string) =>
  `https://wa.me/${whatsappNumber}` + (text ? `?text=${encodeURIComponent(text)}` : "");

/** mailto: link, optionally with a subject line filled in. */
export const mail = (subject?: string) =>
  `mailto:${email}` + (subject ? `?subject=${encodeURIComponent(subject)}` : "");

export const hello = "Hi Ravi, I found you on bvrinfra.in.";

// Generic drawn icons (24×24, stroked), not brand logos.
export const icons = {
  email: '<path d="M3.5 6.5h17v11h-17z"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
  chat: '<path d="M4 5.5h16v10H9.5L5.5 19v-3.5H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  phone: '<path d="M7.2 3.8 9.7 4.4l1 4.1-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 4.1 1-.1 2.6c-.1 1.2-1.1 2.1-2.3 2A16.5 16.5 0 0 1 3.6 7c-.1-1.2.8-2.2 2-2.3z"/>',
  profile: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h3.5M14.5 13h3.5"/>',
  code: '<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 5l-3 14"/>',
  doc: '<path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5v4h4M9 12h6M9 15.5h6"/>',
};
