import { User } from "../models/user.model";
import { apiError } from '../utils/apiError.js'
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const RegisterUser = asyncHandler(async (req, res) => {
    const { username, fullName, email, password } = req.body
    if (!username || !fullName || !email || !password) {
        throw new apiError(400, 'All Fields are required !!')
    }
    const existedUser = await User.findOne(
        {
            $or: [{ username }, { email }]
        }
    )
    if (existedUser) {
        throw new apiError(409, 'User with email or Username already exist !!')
    }
    let avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new apiError(400, 'avatar required !!')
    }
    let avatar = uploadOnCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new apiError(400, 'Avatar file is required !!')
    }
    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        avatar: avatar.url,
        email,
        password,
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new apiError(500, "Internal server Error !!")
    }
    return res.status(200).json(
        new apiResponse(200, createdUser, "User created SuccessFully !!")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body
    if (!username || !email) {
        throw new apiError(400, 'Username & password is required !!')
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new apiError(404, 'User not found !!')
    }

    const isPasswordValid = await User.isPasswordValid(password);
    if (!isPasswordValid) {
        throw new apiError(401, 'Incorrect Password')
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken)
        .json(
            new apiResponse(
                200,
                {
                    user: loggedInUser,
                    refreshToken,
                    accessToken
                },
                "User Logged In successfully !!"
            )
        )
})
const logoutUser = asyncHandler(async (req, res) => {
    const id = req.user._id;
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }, {
        new: true,
    }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).clearCookie("accessToken", options)
        .clearCookie("refreshToken", options).json(
            new ApiResponse(200, {}, "User logged out successfully")
        )

})
const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) {
            throw new ApiError(401, "unauthorized request")
        }
        // console.log(incomingRefreshToken)
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        let _id = decodedToken._id
        const user = await User.findById({ _id })
        if (!user) {
            throw new ApiError(401, "invalid refresh token !!")
        }
        // console.log(user.refreshToken,user)
        if (incomingRefreshToken != user?.refreshToken) {
            throw new ApiError(401, 'Refresh token is expired or used')
        }
        const options = {
            httpOnly: true,
            secure: true,
        }
        const { accessToken, newrefreshToken } = await generateAccessAndRefereshTokens(user?._id)
        return res.status(200)
            .cookie('accessToken', accessToken).
            cookie('refreshToken', newrefreshToken).json(new ApiResponse(200, { accessToken, newrefreshToken }, "Access token refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Internal server error")
    }
})

const changeUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    // console.log(oldPassword,newPassword,'gkhgk')
    const user_id = req.user?._id
    const user = await User.findById(user_id)
    console.log(user)
    const isPasswordCorrect = await user.isPasswrordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Invalid old password')
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, {}, "Password Updated !!"))
})
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, 'User fetched successfully !!'))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is missing')

    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, 'Error while updating avatar')
    }
    const person = await User.findById(req.user?._id);
    const prevUrl = person.avatar;
    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    }
        , { new: true }
    ).select("-password")
    deleteFromCloudinary(prevUrl)
    return res.status(200).json(new ApiResponse(200, user, "avatar updated"))
})
export {
    RegisterUser,
    loginUser,
    getCurrentUser,
    refreshAccessToken,
    logoutUser,
    updateUserAvatar
}