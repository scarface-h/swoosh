-- The official MySQL image creates the application user from MYSQL_USER.
-- Explicitly constrain it to the application database and avoid global grants.
SET PERSIST log_error_verbosity = 2;
