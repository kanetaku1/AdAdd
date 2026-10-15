"use client"

import { Button } from "@/components/ui/button"
import { listMockSignInUsers, signInAsMockUser } from "@/lib/auth/mock-session"
import { roleLabel } from "@/types/user"

/**
 * Mock mode sign-in (spec/frontend.md#Mock mode login): one button per mock
 * User with a Role. A full page load after choosing makes every provider
 * start over as that User.
 */
export function MockSignInButtons() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <p className="text-center text-sm text-muted-foreground">
        確認するロールのユーザーを選んでください
      </p>
      {listMockSignInUsers().map((user) => (
        <Button
          key={user.id}
          variant="outline"
          onClick={() => {
            signInAsMockUser(user.id)
            window.location.assign("/")
          }}
        >
          {user.name}（{user.roles.map(roleLabel).join("・")}）
        </Button>
      ))}
    </div>
  )
}
