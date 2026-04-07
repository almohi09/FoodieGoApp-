# Supabase Storage RLS Policies

Date: April 7, 2026

## Purpose

This document defines the Row Level Security (RLS) policies required for FoodieGo's Supabase Storage bucket to match the backend's upload validation layer.

## Required Policies

Apply these policies to the `foodiego-storage` bucket in Supabase Dashboard > Storage > Buckets > foodiego-storage > Policies.

### Bucket Structure

```
foodiego-storage/
├── customer/{userId}/
│   └── avatars/
│   └── addresses/
├── seller/{userId}/
│   └── menu/
│   └── documents/
├── admin/{userId}/
│   └── reports/
│   └── moderation/
└── public/
    └── restaurants/
```

### RLS Policy SQL

Run these in Supabase Dashboard > SQL Editor:

```sql
-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Customer: Can only read/write their own files
CREATE POLICY "customer_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "customer_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "customer_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "customer_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Seller: Can only read/write their own files
CREATE POLICY "seller_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'seller'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "seller_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'seller'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "seller_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'seller'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "seller_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'seller'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Admin: Full access to all files
CREATE POLICY "admin_full_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'foodiego-storage'
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Public: Read-only access to public folder
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'foodiego-storage'
    AND (storage.foldername(name))[1] = 'public'
  );
```

### Validation Checklist

After applying policies, verify in Supabase Dashboard:

- [ ] RLS is enabled on storage.objects
- [ ] All policies are active (green status)
- [ ] Test customer upload with auth token
- [ ] Test seller upload with auth token
- [ ] Test admin access with admin token
- [ ] Verify unauthorized access is blocked (401/403)

### Evidence Artifact

Save success/failure evidence to:

- `backend/artifacts/storage/rls-policies-applied-YYYY-MM-DD.json`

Example success artifact:

```json
{
  "timestamp": "2026-04-07T12:00:00Z",
  "bucket": "foodiego-storage",
  "policies": {
    "customer_upload_own": "active",
    "customer_read_own": "active",
    "seller_upload_own": "active",
    "admin_full_access": "active",
    "public_read": "active"
  },
  "validation": {
    "customer_upload": "success",
    "seller_upload": "success",
    "admin_access": "success",
    "unauthorized_blocked": "success"
  },
  "status": "PASS"
}
```
