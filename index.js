import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import 'dotenv/config'

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

// let users = [
//   { id: 1, name: "Angela", color: "teal" },
//   { id: 2, name: "Jack", color: "powderblue" },
// ];

async function getUsers(){
  const query = 
  "SELECT * FROM users";
  const result = await db.query(query);
  return result.rows
}

async function checkVisisted(userId) {
  const query = "SELECT y.country_code FROM countries y JOIN visited_countries v ON y.id=v.countries_id WHERE v.user_id=$1;"
  const result = await db.query(query,[userId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  //console.log(countries)
  return countries;
}

async function getUserColor(userId) {
  const query = "SELECT color FROM users WHERE id=$1;"
  const result = await db.query(query,[userId]);
  //console.log(result.rows[0].color)
  return result.rows[0].color;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted(currentUserId);
  const color = await getUserColor(currentUserId)
  const users = await getUsers();
  //console.log(users, color, countries)
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body.country;
  console.log(input)
  try {
    const result = await db.query(
      "SELECT id FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryId = data.id;
    try {
      await db.query(
        "INSERT INTO visited_countries (user_id, countries_id) VALUES ($1,$2)",
        [currentUserId,countryId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add==="new"){
    console.log(req.body.name)
    res.render("new.ejs")
  } else {
    currentUserId = req.body.user;
    res.redirect("/")
  }
});

app.post("/new", async (req, res) => {
  const {name, color} = req.body;
  const result = await db.query("INSERT INTO users(name,color) VALUES ($1,$2) RETURNING id;",[name,color]);
  currentUserId=result.rows[0].id
  console.log(currentUserId)
  res.redirect("/")
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
