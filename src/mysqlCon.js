"use strict";

const mysql = require("mysql2/promise");

const sql = mysql.createPool({
    host: "n1nlmysql31plsk.secureserver.net",
    port: "3306",
    user: "dbuserttrglbil",
    password: "Ng7kf@44",
    database: "ttrgl_bil",
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
});

exports.sor = async function sorgu(queryS) {
    try {
        const rows = await sql.query(queryS);
        return rows[0];
    } catch (err) {
        console.log(err);
    }
};
