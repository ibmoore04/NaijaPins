# API Specification - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED  
> **Target Audience:** Frontend Engineers, Backend Engineers, QA Engineers  

---

## 1. API Architecture Overview

NaijaPins uses the **Supabase JavaScript SDK (`@supabase/supabase-js`)** on the client to interact with PostgreSQL via **PostgREST**, **Storage API**, and custom **Database RPC (Remote Procedure Call) functions**.

### Standard Response Data Wrappers
All service layer calls wrap Supabase responses into predictable, typed TypeScript results:

```typescript
export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

export type ApiError = {
  code: string;
  message: string;
  details?: string;
  status: number;
};
```

---

## 2. Authentication API (`authService`)

### 2.1 `signUp`
Registers a new user account.
- **Parameters:**
  ```typescript
  {
    email: string;
    password: string;
    fullName: string;
  }
  ```
- **Returns:** `ApiResponse<{ user: User; session: Session | null }>`

### 2.2 `signInWithPassword`
Authenticates existing user with email and password.
- **Parameters:** `{ email: string; password: string }`
- **Returns:** `ApiResponse<{ user: User; session: Session }>`

### 2.3 `signOut`
Terminates current session.
- **Returns:** `ApiResponse<void>`

---

## 3. Spatial & Map Memory API (`mapService`)

### 3.1 `getMapPinsInBounds` (RPC Function)
Executes a spatial bounding-box query to retrieve memory pins within the active map viewport.

- **RPC Name:** `get_map_pins_in_bounds`
- **SQL Function Definition:**
  ```sql
  CREATE OR REPLACE FUNCTION get_map_pins_in_bounds(
      min_lat DOUBLE PRECISION,
      max_lat DOUBLE PRECISION,
      min_lng DOUBLE PRECISION,
      max_lng DOUBLE PRECISION,
      start_year INTEGER DEFAULT 1960,
      end_year INTEGER DEFAULT 2030,
      category_id_filter UUID DEFAULT NULL
  )
  RETURNS TABLE (
      id UUID,
      title TEXT,
      slug TEXT,
      date_type TEXT,
      year INTEGER,
      city TEXT,
      category_name TEXT,
      category_icon TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      thumbnail_url TEXT,
      has_audio BOOLEAN
  ) LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT 
          m.id,
          m.title,
          m.slug,
          m.date_type::TEXT,
          m.year,
          l.city,
          c.name as category_name,
          c.icon as category_icon,
          l.latitude,
          l.longitude,
          (SELECT file_url FROM memory_media mm WHERE mm.memory_id = m.id AND mm.media_type = 'image' ORDER BY display_order ASC LIMIT 1) as thumbnail_url,
          EXISTS(SELECT 1 FROM memory_media mm WHERE mm.memory_id = m.id AND mm.media_type = 'audio') as has_audio
      FROM memories m
      JOIN locations l ON m.location_id = l.id
      JOIN categories c ON m.category_id = c.id
      WHERE m.status = 'published' 
        AND m.is_deleted = false
        AND l.latitude BETWEEN min_lat AND max_lat
        AND l.longitude BETWEEN min_lng AND max_lng
        AND m.year BETWEEN start_year AND end_year
        AND (category_id_filter IS NULL OR m.category_id = category_id_filter);
  $$;
  ```

- **Client Call:**
  ```typescript
  const { data, error } = await supabase.rpc('get_map_pins_in_bounds', {
    min_lat: 6.4000,
    max_lat: 6.7000,
    min_lng: 3.2000,
    max_lng: 3.6000,
    start_year: 1970,
    end_year: 1990,
    category_id_filter: 'category-uuid-optional'
  });
  ```

---

## 4. Memory Management API (`memoryService`)

### 4.1 `getMemoryBySlug`
Retrieves full memory details including location, category, media list, and author profile.

- **Parameters:** `slug: string`
- **Return Signature:**
  ```typescript
  export interface MemoryDetailResponse {
    id: string;
    title: string;
    slug: string;
    story: string;
    dateType: 'EXACT_DATE' | 'EXACT_YEAR' | 'DECADE' | 'DATE_RANGE';
    year: number;
    endYear?: number;
    exactDate?: string;
    viewCount: number;
    createdAt: string;
    location: {
      id: string;
      country: string;
      state: string;
      lga: string;
      city: string;
      neighborhood: string;
      formattedAddress: string;
      latitude: number;
      longitude: number;
    };
    category: {
      id: string;
      name: string;
      slug: string;
      icon: string;
    };
    author: {
      userId: string;
      fullName: string;
      avatarUrl?: string;
    };
    media: Array<{
      id: string;
      mediaType: 'image' | 'audio';
      fileUrl: string;
      caption?: string;
      displayOrder: number;
    }>;
  }
  ```

### 4.2 `createMemory`
Submits a new memory record along with location creation.

- **Parameters:**
  ```typescript
  export interface CreateMemoryPayload {
    title: string;
    story: string;
    dateType: 'EXACT_DATE' | 'EXACT_YEAR' | 'DECADE' | 'DATE_RANGE';
    year: number;
    endYear?: number;
    exactDate?: string;
    categoryId: string;
    location: {
      state: string;
      lga: string;
      city: string;
      neighborhood?: string;
      formattedAddress: string;
      latitude: number;
      longitude: number;
    };
    mediaFiles: Array<{
      file: File;
      mediaType: 'image' | 'audio';
      caption?: string;
    }>;
  }
  ```

---

## 5. Media Upload API (`mediaService`)

### 5.1 `uploadMediaFile`
Direct storage file upload helper.

- **Parameters:** `bucket: 'memory-images' | 'memory-audio' | 'avatars'`, `filePath: string`, `file: File`
- **Execution:**
  ```typescript
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '360000',
      upsert: false
    });
  ```
- **Returns:** `{ publicUrl: string }`

---

## 6. Reporting & Moderation API (`adminService`)

### 6.1 `submitReport`
Allows users to report a memory for policy violation.
- **Parameters:** `{ memoryId: string; reason: string; details?: string }`
- **Returns:** `ApiResponse<{ reportId: string }>`

### 6.2 `getModerationQueue` (Admin Only)
Fetches pending reports and flagged memories.
- **Parameters:** `{ status?: 'pending' | 'under_review'; page?: number; limit?: number }`
- **Returns:** `ApiResponse<{ reports: ModerationReport[]; totalCount: number }>`

### 6.3 `moderateMemory` (Admin Only)
Performs moderator status updates and logs moderation audit.
- **Parameters:**
  ```typescript
  {
    memoryId: string;
    action: 'APPROVE' | 'REJECT' | 'HIDE' | 'RESTORE';
    reason: string;
  }
  ```

---

## 7. Admin Dashboard Analytics RPC (`get_admin_dashboard_stats`)

```sql
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
    total_memories BIGINT,
    published_memories BIGINT,
    pending_reports BIGINT,
    total_users BIGINT,
    top_category TEXT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT 
        (SELECT COUNT(*) FROM memories WHERE is_deleted = false) as total_memories,
        (SELECT COUNT(*) FROM memories WHERE status = 'published' AND is_deleted = false) as published_memories,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM profiles) as total_users,
        (SELECT c.name FROM memories m JOIN categories c ON m.category_id = c.id GROUP BY c.name ORDER BY COUNT(*) DESC LIMIT 1) as top_category;
$$;
```
