-- VYRAL Voice Studio: allow persisted voice recordings in the existing private media bucket.
update storage.buckets
set allowed_mime_types = array[
  'image/png','image/jpeg','image/webp',
  'video/mp4','video/quicktime',
  'audio/mp4','audio/x-m4a','audio/m4a','audio/aac',
  'audio/webm','audio/ogg','audio/mpeg'
]::text[]
where id = 'scheduled-media';
