"use client";

import { useMemo } from "react";
import { useGetMeQuery } from "@/store/adminApi";
import {
  can,
  canAccessPath,
  hasPanelAccess,
  isSuperAdmin,
  type AccessUser,
} from "@/lib/permissions";

export function useAdminAccess() {
  const { data: me, isLoading, isFetching, isError } = useGetMeQuery();

  return useMemo(() => {
    const user = me as AccessUser;
    return {
      user,
      isLoading: isLoading || (isFetching && !me),
      isError,
      isSuper: isSuperAdmin(user),
      hasPanelAccess: hasPanelAccess(user),
      can: (permission: string | null | undefined) => can(user, permission),
      canAccessPath: (pathname: string) => canAccessPath(user, pathname),
    };
  }, [me, isLoading, isFetching, isError]);
}
