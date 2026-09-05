-- Anonymous sellers may upload sale evidence, but cannot read or mutate objects.

revoke select, update, delete on table storage.objects from anon, authenticated;
