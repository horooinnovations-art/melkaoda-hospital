import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  ApiResponse,
  PaginatedResponse,
  SiteSettings,
} from "@/lib/types";
import type { AdminUser } from "@/lib/auth";
import { getToken, clearToken } from "@/lib/auth";
import { getApiBase } from "@/lib/api";

export type AdminResource =
  | "departments"
  | "department-categories"
  | "doctors"
  | "services"
  | "specializations"
  | "leadership"
  | "leadership-history"
  | "news"
  | "news-categories"
  | "announcements"
  | "gallery"
  | "gallery-categories"
  | "pages"
  | "events"
  | "careers"
  | "testimonials"
  | "faqs"
  | "downloads"
  | "insurance"
  | "emergency-services"
  | "health-education"
  | "partnerships"
  | "partnership-categories"
  | "roles"
  | "permissions";

export interface DashboardData {
  counts: Record<string, number>;
  recentContacts: ContactSubmission[];
  recentNews: { id: number; title: string; status?: string; published_at?: string; created_at?: string }[];
  warning?: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  department?: string;
  status: string;
  reply_message?: string;
  created_at?: string;
  replied_at?: string;
}

export interface MediaItem {
  id: number;
  filename: string;
  url: string;
  mime_type?: string;
  folder?: string;
  size?: number;
  created_at?: string;
}

export interface AuditLog {
  id: number;
  action: string;
  model_type?: string | null;
  model_id?: number | null;
  user_id?: number | null;
  user?: { id: number; name?: string | null; email?: string | null } | null;
  user_name?: string | null;
  user_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  url?: string | null;
  method?: string | null;
  old_values?: unknown;
  new_values?: unknown;
  changes?: unknown;
  request_data?: unknown;
  response_status?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLogsListResponse extends PaginatedResponse<AuditLog> {
  filters?: {
    actions?: string[];
    model_types?: string[];
    users?: Array<{ id: number; name?: string; email?: string }>;
  };
}

export interface AdminRoleRef {
  id: number;
  name: string;
  slug: string;
  is_system?: boolean;
}

export interface AdminUserRecord {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  avatar?: string | null;
  roles?: AdminRoleRef[];
  created_at?: string;
  last_login_at?: string;
}

export interface AdminRoleRecord {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_system?: boolean;
  users_count?: number;
  permissions_count?: number;
  permissions?: AdminPermissionRecord[];
  permission_ids?: number[];
}

export interface AdminPermissionRecord {
  id: number;
  name: string;
  slug: string;
  module?: string;
  description?: string | null;
  roles_count?: number;
}

export interface UsersListResponse extends PaginatedResponse<AdminUserRecord> {
  stats?: { total: number; active: number; inactive: number; suspended: number };
  roles?: AdminRoleRef[];
  can_manage_super_admins?: boolean;
}

export interface PermissionsListResponse extends PaginatedResponse<AdminPermissionRecord> {
  modules?: string[];
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/",
  prepareHeaders: (headers) => {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    return headers;
  },
});

const baseQuery: typeof rawBaseQuery = async (args, api, extra) => {
  const base = getApiBase().replace(/\/$/, "");
  if (typeof args === "string") {
    return rawBaseQuery(`${base}${args.startsWith("/") ? args : `/${args}`}`, api, extra);
  }
  const url = args.url?.startsWith("http")
    ? args.url
    : `${base}${args.url?.startsWith("/") ? args.url : `/${args.url ?? ""}`}`;
  return rawBaseQuery({ ...args, url }, api, extra);
};

const baseQueryWithAuth: typeof baseQuery = async (args, api, extra) => {
  const result = await baseQuery(args, api, extra);

  if (result.error) {
    if (
      result.error.status === "PARSING_ERROR" ||
      (typeof result.error.data === "string" && String(result.error.data).includes("<!DOCTYPE"))
    ) {
      result.error = {
        status: 404,
        data: { message: "Resource endpoint is not available on server database." },
      };
    } else if (result.error.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/admin/login")) {
        clearToken();
        window.location.replace("/admin/login");
      }
    }
  }

  return result;
};

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    "Auth",
    "Dashboard",
    "Settings",
    "Contacts",
    "Media",
    "AuditLogs",
    "Users",
    "Roles",
    "Permissions",
    "AdminResource",
  ],
  endpoints: (builder) => ({
    login: builder.mutation<
      { token: string; user: AdminUser },
      { email: string; password: string }
    >({
      query: (body) => ({
        url: "/admin/login",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<{ token: string; user: AdminUser }>) =>
        res.data,
      invalidatesTags: ["Auth", "Dashboard"],
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/admin/logout", method: "POST" }),
      transformResponse: (res: ApiResponse<{ message: string }>) => res.data,
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          clearToken();
        }
      },
      invalidatesTags: ["Auth"],
    }),

    getMe: builder.query<AdminUser, void>({
      query: () => "/admin/me",
      transformResponse: (res: ApiResponse<AdminUser>) => res.data,
      providesTags: ["Auth"],
    }),

    updateMe: builder.mutation<AdminUser, FormData>({
      query: (body) => ({
        url: "/admin/me",
        method: "PUT",
        body,
      }),
      transformResponse: (res: ApiResponse<AdminUser>) => res.data,
      invalidatesTags: ["Auth"],
    }),

    updateMyPassword: builder.mutation<
      { message?: string },
      { current_password: string; password: string; password_confirmation: string }
    >({
      query: (body) => ({
        url: "/admin/me/password",
        method: "PUT",
        body,
      }),
    }),

    getDashboard: builder.query<DashboardData, void>({
      query: () => "/admin/dashboard",
      transformResponse: (res: ApiResponse<DashboardData>) => res.data,
      providesTags: ["Dashboard"],
    }),

    getAdminSettings: builder.query<SiteSettings, void>({
      query: () => "/admin/settings",
      transformResponse: (res: ApiResponse<SiteSettings>) => res.data,
      providesTags: ["Settings"],
    }),

    updateAdminSettings: builder.mutation<SiteSettings, FormData | Record<string, unknown>>({
      query: (body) => ({
        url: "/admin/settings",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<SiteSettings>) => res.data,
      invalidatesTags: ["Settings"],
    }),

    getAdminList: builder.query<
      PaginatedResponse<Record<string, unknown>>,
      { resource: AdminResource; page?: number; perPage?: number; search?: string }
    >({
      query: ({ resource, page = 1, perPage = 20, search }) => ({
        url: `/admin/${resource}`,
        params: { page, perPage, ...(search ? { search } : {}) },
      }),
      transformResponse: (res: ApiResponse<PaginatedResponse<Record<string, unknown>>>) =>
        res.data,
      providesTags: (_r, _e, arg) => [
        { type: "AdminResource", id: `${arg.resource}-LIST` },
      ],
    }),

    getAdminItem: builder.query<
      Record<string, unknown>,
      { resource: AdminResource; id: string | number }
    >({
      query: ({ resource, id }) => `/admin/${resource}/${id}`,
      transformResponse: (res: ApiResponse<Record<string, unknown>>) => res.data,
      providesTags: (_r, _e, arg) => [
        { type: "AdminResource", id: `${arg.resource}-${arg.id}` },
      ],
    }),

    createAdminItem: builder.mutation<
      Record<string, unknown>,
      { resource: AdminResource; body: FormData }
    >({
      query: ({ resource, body }) => ({
        url: `/admin/${resource}`,
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<Record<string, unknown>>) => res.data,
      invalidatesTags: (_r, _e, arg) => [
        { type: "AdminResource", id: `${arg.resource}-LIST` },
        "Dashboard",
      ],
    }),

    updateAdminItem: builder.mutation<
      Record<string, unknown>,
      { resource: AdminResource; id: string | number; body: FormData }
    >({
      query: ({ resource, id, body }) => {
        if (body instanceof FormData) {
          body.append("_method", "PUT");
        }
        return {
          url: `/admin/${resource}/${id}`,
          method: "POST",
          body,
        };
      },
      transformResponse: (res: ApiResponse<Record<string, unknown>>) => res.data,
      invalidatesTags: (_r, _e, arg) => [
        { type: "AdminResource", id: `${arg.resource}-LIST` },
        { type: "AdminResource", id: `${arg.resource}-${arg.id}` },
        "Dashboard",
      ],
    }),

    deleteAdminItem: builder.mutation<
      { message: string },
      { resource: AdminResource; id: string | number }
    >({
      query: ({ resource, id }) => ({
        url: `/admin/${resource}/${id}`,
        method: "DELETE",
      }),
      transformResponse: (res: ApiResponse<{ message: string }>) => res.data,
      invalidatesTags: (_r, _e, arg) => [
        { type: "AdminResource", id: `${arg.resource}-LIST` },
        "Dashboard",
      ],
    }),

    getContacts: builder.query<
      PaginatedResponse<ContactSubmission>,
      { page?: number; perPage?: number }
    >({
      query: ({ page = 1, perPage = 10 } = {}) => ({
        url: "/admin/contact-submissions",
        params: { page, perPage },
      }),
      transformResponse: (res: ApiResponse<PaginatedResponse<ContactSubmission>>) =>
        res.data,
      providesTags: (result) =>
        result?.data?.length
          ? [
              ...result.data.map(({ id }) => ({ type: "Contacts" as const, id })),
              { type: "Contacts", id: "LIST" },
            ]
          : [{ type: "Contacts", id: "LIST" }],
    }),

    getContact: builder.query<ContactSubmission, number>({
      query: (id) => `/admin/contact-submissions/${id}`,
      transformResponse: (res: ApiResponse<ContactSubmission>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Contacts", id }],
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Refresh list + unread badge without refetching this detail (avoids a loop)
          dispatch(
            adminApi.util.invalidateTags([
              { type: "Contacts", id: "LIST" },
              "Dashboard",
            ])
          );
        } catch {
          /* ignore */
        }
      },
    }),

    replyContact: builder.mutation<
      { message: string },
      { id: number; reply_message: string }
    >({
      query: ({ id, reply_message }) => ({
        url: `/admin/contact-submissions/${id}/reply`,
        method: "POST",
        body: { reply_message },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Contacts", id: "LIST" },
        { type: "Contacts", id: arg.id },
        "Dashboard",
      ],
    }),

    getMedia: builder.query<
      { data: MediaItem[]; meta: { total: number; page: number; perPage: number } },
      { page?: number; perPage?: number }
    >({
      query: ({ page = 1, perPage = 24 } = {}) => ({
        url: "/admin/media",
        params: { page, perPage },
      }),
      transformResponse: (
        res: ApiResponse<{ data: MediaItem[]; meta: { total: number; page: number; perPage: number } }>
      ) => res.data,
      providesTags: ["Media"],
    }),

    uploadMedia: builder.mutation<MediaItem, FormData>({
      query: (body) => ({
        url: "/admin/media/upload",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<MediaItem>) => res.data,
      invalidatesTags: ["Media"],
    }),

    deleteMedia: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/admin/media/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Media"],
    }),

    getAuditLogs: builder.query<
      AuditLogsListResponse,
      {
        page?: number;
        perPage?: number;
        search?: string;
        user_id?: string | number;
        action?: string;
        model_type?: string;
        date_from?: string;
        date_to?: string;
      }
    >({
      query: ({
        page = 1,
        perPage = 50,
        search,
        user_id,
        action,
        model_type,
        date_from,
        date_to,
      } = {}) => ({
        url: "/admin/audit-logs",
        params: {
          page,
          perPage,
          ...(search ? { search } : {}),
          ...(user_id ? { user_id } : {}),
          ...(action ? { action } : {}),
          ...(model_type ? { model_type } : {}),
          ...(date_from ? { date_from } : {}),
          ...(date_to ? { date_to } : {}),
        },
      }),
      transformResponse: (res: ApiResponse<AuditLogsListResponse>) => res.data,
      providesTags: ["AuditLogs"],
    }),

    getAuditLog: builder.query<AuditLog, number>({
      query: (id) => `/admin/audit-logs/${id}`,
      transformResponse: (res: ApiResponse<AuditLog>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "AuditLogs", id }],
    }),

    getUsers: builder.query<
      UsersListResponse,
      { page?: number; perPage?: number; search?: string; status?: string; role?: string }
    >({
      query: ({ page = 1, perPage = 15, search, status, role } = {}) => ({
        url: "/admin/users",
        params: {
          page,
          perPage,
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(role ? { role } : {}),
        },
      }),
      transformResponse: (res: ApiResponse<UsersListResponse>) => res.data,
      providesTags: ["Users"],
    }),

    getUser: builder.query<AdminUserRecord, number>({
      query: (id) => `/admin/users/${id}`,
      transformResponse: (res: ApiResponse<AdminUserRecord>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Users", id }],
    }),

    createUser: builder.mutation<AdminUserRecord, Record<string, unknown>>({
      query: (body) => ({
        url: "/admin/users",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<AdminUserRecord>) => res.data,
      invalidatesTags: ["Users"],
    }),

    updateUser: builder.mutation<AdminUserRecord, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/admin/users/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (res: ApiResponse<AdminUserRecord>) => res.data,
      invalidatesTags: ["Users", "Auth"],
    }),

    deleteUser: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),

    getRoles: builder.query<
      PaginatedResponse<AdminRoleRecord>,
      { page?: number; perPage?: number; search?: string }
    >({
      query: ({ page = 1, perPage = 15, search } = {}) => ({
        url: "/admin/roles",
        params: { page, perPage, ...(search ? { search } : {}) },
      }),
      transformResponse: (res: ApiResponse<PaginatedResponse<AdminRoleRecord>>) => res.data,
      providesTags: ["Roles"],
    }),

    getRole: builder.query<AdminRoleRecord, number>({
      query: (id) => `/admin/roles/${id}`,
      transformResponse: (res: ApiResponse<AdminRoleRecord>) => res.data,
      providesTags: (_r, _e, id) => [{ type: "Roles", id }],
    }),

    createRole: builder.mutation<AdminRoleRecord, Record<string, unknown>>({
      query: (body) => ({
        url: "/admin/roles",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<AdminRoleRecord>) => res.data,
      invalidatesTags: ["Roles", "Permissions", "Auth"],
    }),

    updateRole: builder.mutation<AdminRoleRecord, { id: number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `/admin/roles/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (res: ApiResponse<AdminRoleRecord>) => res.data,
      invalidatesTags: ["Roles", "Permissions", "Auth"],
    }),

    deleteRole: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/admin/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Roles", "Permissions", "Auth"],
    }),

    getPermissionsGrouped: builder.query<
      {
        grouped: Record<string, AdminPermissionRecord[]>;
        modules: string[];
        flat: AdminPermissionRecord[];
      },
      void
    >({
      query: () => "/admin/permissions/grouped",
      transformResponse: (
        res: ApiResponse<{
          grouped: Record<string, AdminPermissionRecord[]>;
          modules: string[];
          flat: AdminPermissionRecord[];
        }>
      ) => res.data,
      providesTags: ["Permissions"],
    }),

    getPermissions: builder.query<
      PermissionsListResponse,
      { page?: number; perPage?: number; search?: string; module?: string }
    >({
      query: ({ page = 1, perPage = 20, search, module } = {}) => ({
        url: "/admin/permissions",
        params: {
          page,
          perPage,
          ...(search ? { search } : {}),
          ...(module ? { module } : {}),
        },
      }),
      transformResponse: (res: ApiResponse<PermissionsListResponse>) => res.data,
      providesTags: ["Permissions"],
    }),

    createPermission: builder.mutation<AdminPermissionRecord, Record<string, unknown>>({
      query: (body) => ({
        url: "/admin/permissions",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<AdminPermissionRecord>) => res.data,
      invalidatesTags: ["Permissions"],
    }),

    updatePermission: builder.mutation<
      AdminPermissionRecord,
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/permissions/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (res: ApiResponse<AdminPermissionRecord>) => res.data,
      invalidatesTags: ["Permissions"],
    }),

    deletePermission: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/admin/permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Permissions"],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useUpdateMyPasswordMutation,
  useGetDashboardQuery,
  useGetAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
  useGetAdminListQuery,
  useGetAdminItemQuery,
  useCreateAdminItemMutation,
  useUpdateAdminItemMutation,
  useDeleteAdminItemMutation,
  useGetContactsQuery,
  useGetContactQuery,
  useReplyContactMutation,
  useGetMediaQuery,
  useUploadMediaMutation,
  useDeleteMediaMutation,
  useGetAuditLogsQuery,
  useGetAuditLogQuery,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsGroupedQuery,
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
} = adminApi;
