-- Admin プラグインをやめたため、0002 で足した列を消す（cms#12）。
-- better-auth の auth generate は列を足す差分しか出さず、使わなくなった列は残るため、手で書く
alter table "user" drop column "role";

alter table "user" drop column "banned";

alter table "user" drop column "banReason";

alter table "user" drop column "banExpires";

alter table "session" drop column "impersonatedBy";
