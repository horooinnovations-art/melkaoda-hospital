import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  ApiResponse,
  HomeData,
  PaginatedResponse,
  PublicResource,
  SiteSettings,
} from "@/lib/types";
import { getApiBase } from "@/lib/api";

const rawBaseQuery = fetchBaseQuery({
  // Resolved per-request so the browser uses the same-origin `/api/v1` proxy.
  baseUrl: "/",
  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

const baseQuery: typeof rawBaseQuery = async (args, api, extra) => {
  const base = getApiBase().replace(/\/$/, "");
  const path = typeof args === "string" ? args : args.url ?? "";
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await rawBaseQuery(typeof args === "string" ? url : { ...args, url }, api, extra);
  if (res.error) {
    if (
      res.error.status === "PARSING_ERROR" ||
      (typeof res.error.data === "string" && String(res.error.data).includes("<!DOCTYPE"))
    ) {
      res.error = {
        status: 404,
        data: { message: "Resource endpoint not found." },
      };
    }
  }
  return res;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  keepUnusedDataFor: 600,
  tagTypes: [
    "Home",
    "Settings",
    "Departments",
    "Doctors",
    "Services",
    "Leadership",
    "LeadershipHistory",
    "News",
    "Announcements",
    "Gallery",
    "Pages",
    "Events",
    "Careers",
    "Testimonials",
    "FAQs",
    "Insurance",
    "Emergency",
    "HealthEducation",
    "Partnerships",
    "Downloads",
  ],
  endpoints: (builder) => ({
    getHome: builder.query<HomeData, void>({
      query: () => "/public/home",
      transformResponse: (res: ApiResponse<HomeData>) => res.data,
      providesTags: ["Home"],
    }),
    getSettings: builder.query<SiteSettings, void>({
      query: () => "/public/settings",
      transformResponse: (res: ApiResponse<SiteSettings>) => res.data,
      providesTags: ["Settings"],
    }),
    getResourceList: builder.query<
      PaginatedResponse<unknown>,
      { resource: PublicResource; page?: number; perPage?: number; search?: string }
    >({
      query: ({ resource, page = 1, perPage = 12, search }) => ({
        url: `/public/${resource}`,
        params: { page, perPage, ...(search ? { search } : {}) },
      }),
      transformResponse: (res: ApiResponse<PaginatedResponse<unknown>>) => res.data,
      providesTags: (_r, _e, arg) => [{ type: tagForResource(arg.resource), id: "LIST" }],
    }),
    getResourceItem: builder.query<
      unknown,
      { resource: PublicResource; idOrSlug: string }
    >({
      query: ({ resource, idOrSlug }) => `/public/${resource}/${idOrSlug}`,
      transformResponse: (res: ApiResponse<unknown>) => res.data,
      providesTags: (_r, _e, arg) => [
        { type: tagForResource(arg.resource), id: arg.idOrSlug },
      ],
    }),
    submitContact: builder.mutation<
      { id: number },
      {
        name: string;
        email: string;
        phone?: string;
        subject: string;
        message: string;
        department?: string;
      }
    >({
      query: (body) => ({
        url: "/public/contact",
        method: "POST",
        body,
      }),
      transformResponse: (res: ApiResponse<{ id: number }>) => res.data,
    }),
    /**
     * Public download counter. Deliberately provides no tags: the count is
     * shown in the admin list, not on the public page, so invalidating the
     * Downloads list here would refetch the whole grid on every click.
     */
    trackDownload: builder.mutation<
      { id: number; download_count: number },
      { idOrSlug: string | number }
    >({
      query: ({ idOrSlug }) => ({
        url: `/public/downloads/${idOrSlug}/track`,
        method: "POST",
      }),
      transformResponse: (res: ApiResponse<{ id: number; download_count: number }>) =>
        res.data,
    }),
    applyCareer: builder.mutation<{ message: string }, { slug: string; formData: FormData }>({
      query: ({ slug, formData }) => ({
        url: `/public/careers/${slug}/apply`,
        method: "POST",
        body: formData,
      }),
    }),
    registerEvent: builder.mutation<
      { message: string },
      {
        slug: string;
        data: {
          name: string;
          email: string;
          phone: string;
          organization?: string;
          notes?: string;
        };
      }
    >({
      query: ({ slug, data }) => ({
        url: `/public/events/${slug}/register`,
        method: "POST",
        body: data,
      }),
    }),
  }),
});

function tagForResource(resource: PublicResource) {
  const map: Record<PublicResource, string> = {
    departments: "Departments",
    doctors: "Doctors",
    services: "Services",
    leadership: "Leadership",
    "leadership-history": "LeadershipHistory",
    news: "News",
    announcements: "Announcements",
    gallery: "Gallery",
    pages: "Pages",
    events: "Events",
    careers: "Careers",
    testimonials: "Testimonials",
    faqs: "FAQs",
    insurance: "Insurance",
    "emergency-services": "Emergency",
    "health-education": "HealthEducation",
    partnerships: "Partnerships",
    downloads: "Downloads",
  };
  return map[resource] as
    | "Departments"
    | "Doctors"
    | "Services"
    | "Leadership"
    | "LeadershipHistory"
    | "News"
    | "Announcements"
    | "Gallery"
    | "Pages"
    | "Events"
    | "Careers"
    | "Testimonials"
    | "FAQs"
    | "Insurance"
    | "Emergency"
    | "HealthEducation"
    | "Partnerships"
    | "Downloads";
}

export const {
  useGetHomeQuery,
  useGetSettingsQuery,
  useGetResourceListQuery,
  useGetResourceItemQuery,
  useSubmitContactMutation,
  useTrackDownloadMutation,
  useApplyCareerMutation,
  useRegisterEventMutation,
} = apiSlice;
