# Upute za pokretanje i testiranje

1. Otvoriti <https://web2-security-lab.onrender.com/>.
2. Prijaviti se računom **alice** / **alice123**.
   Ostali računi: **bob** / **bob123**, **attacker** / **attacker123**.
3. Prekidač (checkbox) uključen znači da je ranjivost **omogućena**, a isključen da je **onemogućena**.

## SQL umetanje

1. Uključiti checkbox i unijeti `' OR '1'='1`. Vraćaju se svi korisnici.
2. Unijeti `x' UNION SELECT id, username, password, balance FROM users--`. Ispisuju se zaporke.
3. Isključiti checkbox i unijeti iste ulaze. Dobiva se poruka "Neispravan unos".

## CSRF

1. Prijavljen kao alice (u istom pregledniku), otvoriti napadačku stranicu <https://scam-gift.netlify.app/>.
2. **Uključen checkbox:** GET napad (`<img>`) i POST napad (skriveni obrazac) prenose novac na napadačev račun. Promjena je vidljiva u sučelju.
3. **Isključen checkbox:** GET vraća 405, POST vraća 403, a novac se ne prenosi.
