Upute za pokretanje i testiranje:

Otvoriti https://web2-security-lab.onrender.com/.
Prijaviti se računom alice / alice123. (ostali računi: bob/bob123, attacker/attacker123)
Prekidač (checkbox) uključen znači da je ranjivost omogućena, a isključen da je onemogućena.
SQL umetanje:
Uključiti checkbox i unijeti ' OR '1'='1. Vraćaju se svi korisnici.
Unijeti x' UNION SELECT id, username, password, balance FROM users--. Ispisuju se zaporke.
Isključiti checkbox i unijeti iste ulaze. Dobiva se poruka “Neispravan unos”.
CSRF:
Prijavljen kao alice (u istom pregledniku), otvoriti napadačku stranicu https://scam-gift.netlify.app/.
Uključen checkbox: GET napad (<img>) i POST napad (skriveni obrazac) prenose novac na napadačev račun. Promjena je vidljiva u sučelju.
Isključen checkbox: GET vraća 405, POST vraća 403, a novac se ne prenosi.
