TODO
[ ] UI needs to give the illusion that it’s Airtable, however, doesn’t need to match 1:1
[ ] Just focus on the main page with table, columns, and cells.

DO NEXT
[ ] In each base, I can create tables.

[ ] Be able to dynamically add columns.

[ ] Editing cells, and tabbing across everything should be smooth

[ ] Creating a new table will show default rows and columns. User fakerjs for data

[ ] I want to see a table w/ 100k rows and scroll down without lag
  [ ] Add a button I can click that will add 100k rows to my table.
  [ ] Implement virtualized infinite scroll using TRPC’s hooks and TanStack virtualizer

[ ] I want to be able to search across all the cells

[ ] I want to be able to create a 'view' of a table and save the following configurations
  [ ] Filters on columns: for both numbers (greater than, smaller than) and text (is not empty, is empty, contains, not contains, equal to)
  [ ] Simple sorting on columns: for text A→Z, Z→A, for numbers, do decreasing or increasing
  [ ] Can search through 
  [ ] hide/show columns.

[ ] Search, filter, and sort have to be done at the database level

[X] Make sure there's a loading state

[ ] The ultimate goal - if there are 1m rows, it can still load without an issue!