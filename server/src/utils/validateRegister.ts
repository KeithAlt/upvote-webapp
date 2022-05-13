import { UsernamePasswordInput } from "src/entities/UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
    // Verify email
    if (!options.email.includes("@")) {
        return [
            {
                field: "email",
                message: "invalid email",
            },
        ];
    }

    // Verify username length
    if (options.username.length <= 2) {
        return [
            {
                field: "username",
                message: "username length must be greater than 2",
            },
        ];
    }

    // Verify no banned characters
    if (options.username.includes("@")) {
        return [
            {
                field: "username",
                message: "cannot include an @ sign in username",
            }
        ];
    }

    // Verify password length
    if (options.password.length <= 2) {
        return [
            {
                field: "password",
                message: "password length must be greater than 2",
            },
        ];
    }

    return null;
}