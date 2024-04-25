// Tell Node that we're in test "mode"
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testCompany, testInvoice;
beforeEach(async () => {
    const comp = await db.query(`INSERT INTO companies (code, name, description) 
        VALUES ('ibm', 'IBM', 'Big blue.')
        RETURNING code, name, description`);
    testCompany = comp.rows[0];      
    const inv = await db.query(`INSERT INTO invoices (comp_code, amt, paid, paid_date) 
        VALUES ('ibm', 400, false, null)
        RETURNING id, comp_code, amt, paid, add_date`);
    testInvoice = inv.rows[0];
})

afterEach(async () => {
    await db.query(`DELETE FROM companies`);
})

afterAll(async () => {
    await db.query(`DELETE FROM invoices`);
    await db.end();
})

describe("GET /companies", () => {
    test("Get a list with one company", async () => {
        const res = await request(app).get('/companies');
        expect(res.statusCode).toBe(200);   
        expect(res.body).toEqual({ companies: [testCompany] });
    })
})

describe("GET /companies/:id", () => {
    test("Gets a single company", async () => {
        const res = await request(app).get(`/companies/${testCompany.code}`);
        expect(res.statusCode).toBe(200);
        const invResults = await db.query(`
            SELECT * FROM invoices
            WHERE comp_code = $1`,
            [testCompany.code]);
        testCompany.invoices = invResults.rows; 
        expect(res.body).toEqual({ company: testCompany });
    })
    test("Responds with 404 for invalid code", async () => {
        const res = await request(app).get(`/companies/feaf`);
        expect(res.statusCode).toBe(404);
    })  
})

describe("POST /companies", () => {
  test("Creates a single company", async () => {
    const res = await request(app).post('/companies').send({
      code: 'apple',
      name: 'Apple Computer',
      description: 'Overpriced junk.'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      company: {code: 'apple', name: 'Apple Computer', description: 'Overpriced junk.'}
    });
  })
})

describe("PATCH /companies/:code", () => {
  test("Updates a single company", async () => {
    const res = await request(app).patch(`/companies/${testCompany.code}`).send({
      code: 'ibm',
      name: 'IBM',
      description: 'GOAT'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      company: {code: testCompany.code, name: 'IBM', description: 'GOAT'}
    });    
  })
  test("Responds with 404 for invalid id", async () => {
    const res = await request(app).patch(`/companies/android`);
    expect(res.statusCode).toBe(404);
  })    
})

describe("DELETE /companies/:code", () => {
  test("Deletes a single company", async () => {
    const res = await request(app).delete(`/companies/${testCompany.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({msg: `${testCompany.id} DELETED!`});
  })
})

