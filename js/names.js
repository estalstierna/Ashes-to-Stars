// Procedural name generation by culture.
var G = window.G || (window.G = {});

G.names = (function () {
  var C = {
    anglo: {
      m: ['James', 'Marcus', 'Ethan', 'Cole', 'Dalton', 'Isaiah', 'Wyatt', 'Grant', 'Reed', 'Jonah', 'Tyler', 'Malik'],
      f: ['Ava', 'Harper', 'Maya', 'Claire', 'Jordan', 'Riley', 'Nora', 'Kendra', 'Savannah', 'Imani', 'Quinn', 'Leah'],
      s: ['Walker', 'Hayes', 'Monroe', 'Carter', 'Brooks', 'Sullivan', 'Reyes', 'Washington', 'Kincaid', 'Vance', 'Holloway', 'Pierce']
    },
    euro: {
      m: ['Luca', 'Matthias', 'Julien', 'Tomasz', 'Henrik', 'Mateo', 'Felix', 'Pieter', 'Andrei', 'Lorenzo', 'Elias', 'Noah'],
      f: ['Elena', 'Sophie', 'Ines', 'Margot', 'Katarzyna', 'Lena', 'Chiara', 'Amélie', 'Eva', 'Clara', 'Zofia', 'Marta'],
      s: ['Moreau', 'Becker', 'Rossi', 'Kowalski', 'Van Dijk', 'Lindqvist', 'García', 'Novak', 'Schneider', 'Dubois', 'Costa', 'Weber']
    },
    slavic: {
      m: ['Dmitri', 'Alexei', 'Sergei', 'Mikhail', 'Ivan', 'Yuri', 'Pavel', 'Nikolai', 'Oleg', 'Artem'],
      f: ['Anastasia', 'Irina', 'Natalia', 'Yelena', 'Olga', 'Daria', 'Svetlana', 'Ksenia', 'Vera', 'Alina'],
      s: ['Volkov', 'Morozov', 'Sokolov', 'Petrov', 'Lebedev', 'Orlov', 'Kuznetsov', 'Belov', 'Zaitsev', 'Gromov']
    },
    chinese: {
      m: ['Wei', 'Jun', 'Hao', 'Lei', 'Tao', 'Zhen', 'Ming', 'Bo', 'Qiang', 'Yi'],
      f: ['Mei', 'Lin', 'Xiu', 'Yan', 'Hui', 'Jing', 'Ling', 'Fang', 'Qing', 'Yue'],
      s: ['Zhang', 'Wang', 'Li', 'Chen', 'Liu', 'Zhao', 'Huang', 'Zhou', 'Wu', 'Xu']
    },
    indian: {
      m: ['Arjun', 'Rohan', 'Vikram', 'Aditya', 'Kabir', 'Dev', 'Rahul', 'Sameer', 'Nikhil', 'Ishaan'],
      f: ['Priya', 'Ananya', 'Kavya', 'Meera', 'Diya', 'Sanya', 'Aisha', 'Riya', 'Nisha', 'Tara'],
      s: ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Singh', 'Nair', 'Gupta', 'Kapoor', 'Mehta', 'Rao']
    },
    african: {
      m: ['Kwame', 'Tendai', 'Chidi', 'Amadou', 'Jabari', 'Sizwe', 'Kofi', 'Babajide', 'Tariku', 'Moussa'],
      f: ['Amara', 'Zuri', 'Nia', 'Adaeze', 'Thandiwe', 'Fatou', 'Ayana', 'Imani', 'Makena', 'Folake'],
      s: ['Okafor', 'Mensah', 'Diallo', 'Nkosi', 'Mwangi', 'Adeyemi', 'Kamara', 'Abebe', 'Banda', 'Traoré']
    },
    latin: {
      m: ['Mateo', 'Santiago', 'Diego', 'Rafael', 'Thiago', 'Gabriel', 'Emilio', 'Joaquín', 'Bruno', 'Tomás'],
      f: ['Valentina', 'Camila', 'Lucía', 'Isabela', 'Mariana', 'Sofía', 'Ximena', 'Gabriela', 'Renata', 'Paula'],
      s: ['Silva', 'Ferreira', 'Herrera', 'Castillo', 'Mendoza', 'Rocha', 'Vargas', 'Oliveira', 'Navarro', 'Torres']
    },
    pacific: {
      m: ['Haruto', 'Ren', 'Kenji', 'Daichi', 'Min-jun', 'Ji-ho', 'Takeshi', 'Seo-jun', 'Hiro', 'Kaito'],
      f: ['Yui', 'Sakura', 'Hana', 'Aiko', 'Seo-yeon', 'Ji-woo', 'Rin', 'Min-seo', 'Emi', 'Naomi'],
      s: ['Tanaka', 'Kim', 'Sato', 'Park', 'Watanabe', 'Lee', 'Nakamura', 'Choi', 'Kobayashi', 'Jung']
    },
    arabic: {
      m: ['Omar', 'Khalid', 'Yusuf', 'Faisal', 'Tariq', 'Hamza', 'Rashid', 'Zayed', 'Karim', 'Sami'],
      f: ['Layla', 'Noor', 'Yasmin', 'Mariam', 'Salma', 'Huda', 'Rania', 'Amira', 'Dalia', 'Lina'],
      s: ['Al-Rashid', 'Haddad', 'Al-Mansour', 'Nasser', 'Khoury', 'Al-Farsi', 'Saleh', 'Hakim', 'Aziz', 'Qasim']
    },
    nordic: {
      m: ['Erik', 'Oskar', 'Lars', 'Viktor', 'Anton', 'Gustav', 'Nils', 'Axel', 'Sven', 'Linus'],
      f: ['Astrid', 'Freja', 'Ingrid', 'Elsa', 'Saga', 'Linnea', 'Maja', 'Sigrid', 'Ebba', 'Tove'],
      s: ['Lindberg', 'Karlsson', 'Nyström', 'Bergqvist', 'Ekström', 'Sandberg', 'Holm', 'Lund', 'Falk', 'Åberg']
    },
    turkic: {
      m: ['Emre', 'Arslan', 'Timur', 'Kerem', 'Nurlan', 'Baran', 'Aibek', 'Can', 'Murat', 'Ilyas'],
      f: ['Aylin', 'Zeynep', 'Aigerim', 'Elif', 'Defne', 'Dilnaz', 'Selin', 'Asel', 'Ece', 'Madina'],
      s: ['Yilmaz', 'Demir', 'Nazarbayev', 'Kaya', 'Aliyev', 'Şahin', 'Toktarov', 'Öztürk', 'Karimov', 'Aydin']
    }
  };

  function first(culture, gender) {
    var c = C[culture] || C.anglo;
    var g = gender === 'male' ? 'm' : gender === 'female' ? 'f' : G.util.pick(['m', 'f']);
    return G.util.pick(c[g]);
  }
  function surname(culture) { return G.util.pick((C[culture] || C.anglo).s); }
  function full(culture, gender) { return first(culture, gender) + ' ' + surname(culture); }
  function randomGender() { return G.util.pick(['male', 'female', 'male', 'female', 'nonbinary']); }

  var companyA = ['Helix', 'Ares', 'Orbital', 'Phoenix', 'Meridian', 'Tycho', 'Cobalt', 'Aegis', 'Nova', 'Ironclad', 'Zenith', 'Atlas'];
  var companyB = ['Dynamics', 'Industries', 'Systems', 'Holdings', 'Consortium', 'Works', 'Group', 'Logistics', 'Biotech', 'Aerospace'];
  function company() { return G.util.pick(companyA) + ' ' + G.util.pick(companyB); }

  return { first: first, surname: surname, full: full, randomGender: randomGender, company: company };
})();
