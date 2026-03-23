alter table follows add constraint no_self_follow check (follower_id <> following_id);
