TODO
[ ] UI needs to give the illusion that it’s Airtable, however, doesn’t need to match 1:1
[ ] Just focus on the main page with table, columns, and cells.

DO NEXT
[ ] Sort with multiple fields may

[ ] I want to be able to create a 'view' of a table and save the following configurations
  [ ] Filters on columns: for both numbers (greater than, smaller than) and text (is not empty, is empty, contains, not contains, equal to)
  [ ] Simple sorting on columns: for text A→Z, Z→A, 
  [X]for numbers, do decreasing or increasing
  [ ] Can search through 
  [X] hide/show columns.


[ ] I want to see a table w/ 100k rows and scroll down without lag
  [X] Add a button I can click that will add 100k rows to my table.
  [X] Implement virtualized infinite scroll using TRPC’s hooks and TanStack virtualizer

[ ] I want to be able to search across all the cells



[ ] Search, filter, and sort have to be done at the database level

[X] Make sure there's a loading state

[ ] The ultimate goal - if there are 1m rows, it can still load without an issue!