"use client"

import { useEffect, useState } from "react"

import { Pencil, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconActionButton } from "@/components/icon-action-button"
import { ImportUsersButton } from "@/components/import-users-button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyBlock, EmptyRow, ErrorBanner, LoadingRow } from "@/components/query-state"
import { useCurrentUser } from "@/components/current-user-provider"
import { useUsers } from "@/components/users-provider"
import { isApiEnabled } from "@/lib/api/client"
import { grantRole, listRoles, revokeRole, type RoleOption } from "@/lib/data/roles"
import { createUser, updateUser } from "@/lib/data/users"
import { getErrorMessage } from "@/lib/errors"
import { canAccess } from "@/lib/auth/roles"
import { ROLES, roleLabel, type Role, type User } from "@/types/user"

const ALLOWED_ROLES = ["ADMINISTRATOR"]

type UserForm = {
  studentId: string
  name: string
  email: string
  slackId: string
  roles: Role[]
}

function emptyForm(): UserForm {
  return { studentId: "", name: "", email: "", slackId: "", roles: [] }
}

function formFromUser(user: User): UserForm {
  return {
    studentId: user.studentId,
    name: user.name,
    email: user.email,
    slackId: user.slackId ?? "",
    roles: user.roles,
  }
}

/**
 * User List (spec/frontend.md#Settings > User List, UC-12).
 * Student ID / Name / Email / Slack ID / Role(s) change rarely once a user
 * is set up, so they're edited through a dialog — the same pattern as
 * Company List's "Edit company" action — rather than always-editable cells.
 * This is an explicit exception to Principle 4 (see spec/frontend.md).
 * Active stays an inline toggle: disabling/re-enabling is a frequent,
 * deliberate access-control action, not a profile edit.
 *
 * CSV bulk import (spec/frontend.md#CSV Import / Export) sits next to
 * "ユーザーを追加" and follows Preview → Confirm via POST /users/bulk.
 *
 * Role assignment is API calls separate from the User CRUD save
 * (POST/DELETE /users/{userId}/roles/{roleId}, Issue #63), but the picker
 * itself always edits local `form.roles` first — same as every other field
 * in this dialog, and same as mock mode's picker — and only takes effect
 * on "保存", where the diff against the User's prior roles is applied via
 * grant/revoke calls. A new User has no id yet, so the picker only becomes
 * interactive once editing an existing User.
 */
export default function UsersPage() {
  const { currentUser } = useCurrentUser()
  const canManageUsers = canAccess(currentUser?.roles, ALLOWED_ROLES)
  const {
    users,
    loading,
    error: usersError,
    ensureUsers,
    refresh,
    setUsers,
  } = useUsers()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [roleCatalog, setRoleCatalog] = useState<RoleOption[]>([])

  useEffect(() => {
    void ensureUsers()
  }, [ensureUsers])

  useEffect(() => {
    if (!isApiEnabled()) return
    let cancelled = false
    listRoles()
      .then((list) => {
        if (!cancelled) setRoleCatalog(list)
      })
      .catch(() => {
        // Role picker degrades to empty rather than blocking the whole
        // screen — the rest of User management still works without it.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isOpen = editingId !== null
  const isNew = editingId === "new"

  function roleName(code: string): string {
    return roleCatalog.find((r) => r.code === code)?.name ?? roleLabel(code)
  }

  function openNew() {
    setForm(emptyForm())
    setFormError(null)
    setEditingId("new")
  }

  function openEdit(user: User) {
    setForm(formFromUser(user))
    setFormError(null)
    setEditingId(user.id)
  }

  function toggleFormRole(role: Role) {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }))
  }

  /** Grants/revokes the difference between two Role-code sets via the API. */
  async function applyRoleChanges(
    userId: string,
    before: Role[],
    after: Role[]
  ): Promise<void> {
    const toGrant = after.filter((code) => !before.includes(code))
    const toRevoke = before.filter((code) => !after.includes(code))
    for (const code of toGrant) {
      const role = roleCatalog.find((r) => r.code === code)
      if (role) await grantRole(userId, role.id)
    }
    for (const code of toRevoke) {
      const role = roleCatalog.find((r) => r.code === code)
      if (role) await revokeRole(userId, role.id)
    }
  }

  async function handleSave() {
    if (!form.studentId || !form.name || !form.email) return

    const fields = {
      studentId: form.studentId,
      name: form.name,
      email: form.email,
      slackId: form.slackId || null,
      roles: form.roles,
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (isNew) {
        const created = await createUser(fields)
        setUsers((prev) => [...prev, created])
        setEditingId(null)
        return
      }
      if (!editingId) return

      const updated = await updateUser(editingId, fields)
      if (!isApiEnabled()) {
        setUsers((prev) =>
          prev.map((user) => (user.id === editingId ? updated : user))
        )
        setEditingId(null)
        return
      }

      // API mode: PATCH /users doesn't touch roles (Issue #63's grant/revoke
      // calls are the source of truth) — apply the picker's diff separately.
      const before = users.find((u) => u.id === editingId)?.roles ?? []
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingId ? { ...updated, roles: user.roles } : user
        )
      )
      try {
        await applyRoleChanges(editingId, before, form.roles)
        setUsers((prev) =>
          prev.map((user) =>
            user.id === editingId ? { ...user, roles: form.roles } : user
          )
        )
        setEditingId(null)
      } catch (e) {
        try {
          await refresh()
        } catch {
          // best-effort resync; the formError below still informs the user
        }
        setFormError(
          getErrorMessage(e, {
            fallback: "ロールの更新に失敗しました",
            overrides: { CONFLICT: "既に付与されています" },
          })
        )
      }
    } catch (e) {
      setFormError(
        getErrorMessage(e, {
          fallback: "保存に失敗しました",
          overrides: { CONFLICT: "このメールアドレスは既に使われています" },
        })
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(user: User, checked: boolean) {
    setLoadError(null)
    setTogglingId(user.id)
    try {
      const updated = await updateUser(user.id, { isActive: checked })
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? isApiEnabled()
              ? { ...updated, roles: u.roles }
              : updated
            : u
        )
      )
    } catch (e) {
      setLoadError(
        getErrorMessage(e, { fallback: "有効/無効の切り替えに失敗しました" })
      )
    } finally {
      setTogglingId(null)
    }
  }

  if (!canManageUsers) {
    return <EmptyBlock message="この画面を利用する権限がありません。" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">ユーザー</h2>
          <p className="text-muted-foreground">システム利用者の管理</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportUsersButton
            onImported={() => {
              void refresh().catch((e) => {
                setLoadError(
                  getErrorMessage(e, { fallback: "読み込みに失敗しました" })
                )
              })
            }}
          />
          <IconActionButton label="ユーザーを追加" variant="default" onClick={openNew}>
            <Plus />
          </IconActionButton>
        </div>
      </div>

      <ErrorBanner message={loadError || usersError} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学籍番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>Slack ID</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>有効</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingRow colSpan={7} />
            ) : users.length === 0 ? (
              <EmptyRow colSpan={7} message="ユーザーがまだいません" />
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.studentId}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.slackId ?? "未連携"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        user.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {roleName(role)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      disabled={togglingId === user.id}
                      onCheckedChange={(checked) =>
                        void toggleActive(user, checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <IconActionButton
                      label="編集"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil />
                    </IconActionButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) setEditingId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isNew ? "ユーザーを追加" : "ユーザーを編集"}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="userStudentId">学籍番号</FieldLabel>
              <Input
                id="userStudentId"
                value={form.studentId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, studentId: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="userName">氏名</FieldLabel>
              <Input
                id="userName"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="userEmail">メールアドレス</FieldLabel>
              <Input
                id="userEmail"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="userSlackId">Slack ID</FieldLabel>
              <Input
                id="userSlackId"
                placeholder="未連携"
                value={form.slackId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slackId: e.target.value }))
                }
              />
            </Field>
            {isApiEnabled() ? (
              <Field>
                <FieldLabel>ロール</FieldLabel>
                {isNew ? (
                  <p className="text-sm text-muted-foreground">
                    ユーザー作成後にロールを付与できます。
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {roleCatalog.map((role) => (
                      <Badge
                        key={role.id}
                        variant={
                          form.roles.includes(role.code) ? "default" : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => toggleFormRole(role.code)}
                      >
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            ) : (
              <Field>
                <FieldLabel>ロール</FieldLabel>
                <div className="flex flex-wrap gap-1">
                  {ROLES.map((role) => (
                    <Badge
                      key={role}
                      variant={form.roles.includes(role) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFormRole(role)}
                    >
                      {roleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </Field>
            )}
          </FieldGroup>
          <ErrorBanner message={formError} />
          <DialogFooter>
            <Button
              onClick={() => void handleSave()}
              disabled={
                !form.studentId || !form.name || !form.email || submitting
              }
            >
              {submitting ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
