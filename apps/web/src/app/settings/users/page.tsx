"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { addUser, mockUsers, updateUser } from "@/lib/mock/users"
import { ROLES, type Role, type User } from "@/types/user"

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
 * TODO: replace mockUsers with GET /users, and wire edits to POST/PATCH
 * /users once the backend endpoints exist (spec/api.md).
 */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm())

  const isOpen = editingId !== null
  const isNew = editingId === "new"

  function openNew() {
    setForm(emptyForm())
    setEditingId("new")
  }

  function openEdit(user: User) {
    setForm(formFromUser(user))
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

  function handleSave() {
    if (!form.studentId || !form.name || !form.email) return

    const fields = {
      studentId: form.studentId,
      name: form.name,
      email: form.email,
      slackId: form.slackId || null,
      roles: form.roles,
    }

    if (isNew) {
      const user: User = { id: crypto.randomUUID(), isActive: true, ...fields }
      addUser(user)
      setUsers((prev) => [...prev, user])
    } else if (editingId) {
      updateUser(editingId, fields)
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingId ? { ...user, ...fields } : user
        )
      )
    }
    setEditingId(null)
  }

  function toggleActive(user: User, checked: boolean) {
    updateUser(user.id, { isActive: checked })
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: checked } : u))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Users</h2>
          <p className="text-muted-foreground">システム利用者の管理</p>
        </div>
        <Button onClick={openNew}>ユーザーを追加</Button>
      </div>

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
            {users.map((user) => (
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
                          {role}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.isActive}
                    onCheckedChange={(checked) => toggleActive(user, checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(user)}
                  >
                    編集
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
                    {role}
                  </Badge>
                ))}
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={!form.studentId || !form.name || !form.email}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
