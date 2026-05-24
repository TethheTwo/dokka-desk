
revoke execute on function public.log_ticket_changes() from public, authenticated, anon;
revoke execute on function public.log_note_changes() from public, authenticated, anon;
revoke execute on function public.log_attachment_changes() from public, authenticated, anon;
revoke execute on function public.current_user_email() from public, anon;
