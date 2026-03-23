-- Support half-star ratings (0.5 to 5.0 in 0.5 increments)
alter table logs alter column rating type real;
alter table logs drop constraint if exists logs_rating_check;
alter table logs add constraint logs_rating_check
  check (
    rating >= 0.5 and
    rating <= 5.0 and
    (rating * 2) = floor(rating * 2)
  );
