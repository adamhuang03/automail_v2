// Encrypt password
import { encryptedText } from '@/lib/utils';
import { supabaseServer } from '@/lib/db/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { id, email, password } = await request.json();
    const encryptedPassword = encryptedText(password);

    const { data: existingData, error: fetchError } = await supabaseServer
    .from("user_profile")
    .select("*")
    .eq("profile_id", id)
    if (!existingData || existingData.length === 0) {
    
        console.log("No account found ... adding one", fetchError);
        const { data: inserted_linkedin, error } = await supabaseServer
            .from("user_profile")
            .insert({
            id: id,
            linkedin_email: email,
            linkedin_password: encryptedPassword,
            })

        return NextResponse.json({ message: "Created new account" }, { status: 200 });
    } else {
        console.log("Account found ... updating", fetchError);
        const { error } = await supabaseServer
            .from("user_profile")
            .update({
            linkedin_email: email,
            linkedin_password: encryptedPassword,
            })
            .eq("id", id)
        console.log("Updated account", error);
        return NextResponse.json({ message: "Updated account" }, { status: 200 });
    }
}